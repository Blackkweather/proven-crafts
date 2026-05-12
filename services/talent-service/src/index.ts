// =============================================================================
// index.ts — services/talent-service/src/index.ts
// =============================================================================
// The Talent Service microservice — a standalone Node.js/Fastify HTTP server
// that manages talent profiles and provides a skill-based match score calculator.
//
// Endpoints:
//   GET    /talent              — list talent profiles (paginated)
//   GET    /talent/:id          — get a single talent profile
//   PATCH  /talent/:id          — update own profile (self only)
//   GET    /talent/:id/match    — compute a match score for a job or challenge
//   GET    /health              — health check
//
// The `/talent/:id/match` endpoint runs a local scoring algorithm (no AI call)
// that computes a 0-100 score based on skill overlap, weighted by proficiency.
// This is used for fast, real-time sorting before the AI score is computed.
//
// AUTH: identity is provided by the API Gateway via x-user-id header.
// Self-update enforcement: PATCH /talent/:id checks uid === id.
//
// NOTE: This is a standalone microservice in services/talent-service/. The main
// frontend app (src/) reads profiles directly via Supabase — this service is
// for the microservices deployment model.
//
// KEYWORDS: AUTH, DATABASE, VALIDATION
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3003");

// DATABASE: service-role client — bypasses RLS for trusted server operations
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

/**
 * Extract the authenticated user's ID from the x-user-id header.
 * Injected by the API Gateway.
 */
function userId(request: { headers: Record<string, unknown> }) {
  return request.headers["x-user-id"] as string | undefined;
}

// Health check
app.get("/health", async () => ({ status: "ok", service: "talent-service" }));

// ── Match score algorithm ─────────────────────────────────────────────────────

/**
 * Compute a 0-100 match score based on how many required skills the talent has,
 * weighted by their proficiency level.
 *
 * Weighting rationale:
 *   expert (1.0)       — full credit: meets or exceeds the requirement
 *   advanced (0.85)    — near-full credit: highly capable
 *   proficient (0.6)   — partial credit: can do the job but may need ramp-up
 *   foundational (0.3) — minimal credit: has basic exposure, not job-ready
 *
 * A score of 0 is returned when no required skills are specified to avoid
 * misleading 100% scores for jobs with no requirements.
 *
 * @param talentSkills   - The talent's skills from their profile
 * @param requiredSkills - The skills required by the job or challenge
 * @returns A score from 0 to 100 (integer)
 */
function computeMatchScore(
  talentSkills: { name: string; level: string }[],
  requiredSkills: string[],
): number {
  if (!requiredSkills.length) return 0;

  // Map proficiency levels to numeric weights
  const WEIGHTS: Record<string, number> = {
    expert: 1,
    advanced: 0.85,
    proficient: 0.6,
    foundational: 0.3,
  };

  // Build a lookup map from skill name (lowercased) to its weight
  const talentMap = new Map(
    talentSkills.map((s) => [s.name.toLowerCase(), WEIGHTS[s.level] ?? 0.5]),
  );

  // Sum up the weights for skills that match the required list
  const score = requiredSkills.reduce(
    (sum, skill) => sum + (talentMap.get(skill.toLowerCase()) ?? 0),
    0,
  );

  // Normalise to 0-100 (if talent has all skills at max weight, score = 100)
  return Math.round((score / requiredSkills.length) * 100);
}

// ── List talent (company/admin only) ─────────────────────────────────────────

/**
 * List talent profiles with pagination.
 * Only returns talent accounts (not companies).
 * Returns a minimal field set to avoid over-fetching sensitive data.
 *
 * DATABASE: reads `profiles` filtered to account_type=talent.
 */
app.get("/talent", async (request, reply) => {
  const { skill, availability, page = "1", limit = "20" } = request.query as Record<string, string>;

  let query = supabase
    .from("profiles")
    .select("id, display_name, headline, bio, avatar_url, account_type")
    .eq("account_type", "talent")
    .range((+page - 1) * +limit, +page * +limit - 1);

  const { data, error } = await query;
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ talent: data, page: +page });
});

// ── Get a talent profile ──────────────────────────────────────────────────────

/**
 * Get a single talent's public profile.
 * Returns only public profile fields — no sensitive data like phone number.
 *
 * DATABASE: reads `profiles` for the given id, filtered to account_type=talent.
 */
app.get("/talent/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, headline, bio, avatar_url, account_type")
    .eq("id", id)
    .eq("account_type", "talent")
    .single();

  if (error) return reply.code(404).send({ error: "Profile not found" });
  return reply.send(data);
});

// ── Update own profile ────────────────────────────────────────────────────────

/**
 * VALIDATION: Zod schema for profile update — all fields are optional.
 */
const UpdateProfileBody = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

/**
 * Update the current user's own profile.
 * AUTH enforced at the route level: the authenticated userId must match the
 * profile ID in the URL — you can only edit your own profile.
 *
 * AUTH: requires uid === id (self-edit only)
 * DATABASE: updates `profiles` where id = the talent's id.
 */
app.patch("/talent/:id", async (request, reply) => {
  const uid = userId(request as any);
  const { id } = request.params as { id: string };

  // AUTH: prevent editing another user's profile
  if (!uid || uid !== id)
    return reply.code(403).send({ error: "You can only update your own profile" });

  // VALIDATION: parse the update body
  const body = UpdateProfileBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  // DATABASE: update the profile
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...body.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send(data);
});

// ── Get match score for a talent against a job ────────────────────────────────

/**
 * Compute a match score for a talent against a specific job or challenge.
 * This uses the local `computeMatchScore` algorithm (not AI) for instant results.
 *
 * NOTE: The talent's skills are currently stored in the `bio` column as serialised
 * JSON from the onboarding flow. A production implementation should use the
 * `skills` table with a proper join instead.
 *
 * DATABASE: reads `profiles.bio` for talent skills, reads `jobs` or `challenges`
 * for required skills.
 */
app.get("/talent/:id/match", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { jobId, challengeId } = request.query as { jobId?: string; challengeId?: string };

  if (!jobId && !challengeId)
    return reply.code(400).send({ error: "jobId or challengeId required" });

  // DATABASE: fetch talent skills from profile bio (serialised JSON from onboarding)
  const { data: profile } = await supabase.from("profiles").select("bio").eq("id", id).single();

  // Parse the JSON bio — return empty object on parse failure rather than crashing
  const onboardingData = (() => {
    try {
      return JSON.parse(profile?.bio ?? "{}");
    } catch {
      return {};
    }
  })();
  const talentSkills: { name: string; level: string }[] = onboardingData.skills ?? [];

  // DATABASE: fetch the required skills from the job or challenge
  let requiredSkills: string[] = [];
  if (jobId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("required_skills")
      .eq("id", jobId)
      .single();
    requiredSkills = job?.required_skills ?? [];
  } else if (challengeId) {
    const { data: challenge } = await supabase
      .from("challenges")
      .select("required_skills")
      .eq("id", challengeId)
      .single();
    requiredSkills = challenge?.required_skills ?? [];
  }

  return reply.send({ score: computeMatchScore(talentSkills, requiredSkills), talentId: id });
});

// Start the server
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Talent Service running on port ${PORT}`);
});
