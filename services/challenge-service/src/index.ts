// =============================================================================
// index.ts — services/challenge-service/src/index.ts
// =============================================================================
// The Challenge Service microservice — a standalone Node.js/Fastify HTTP server
// that manages skill challenges and their submissions.
//
// Challenges are skill tests posted by companies; talent can submit entries.
// This service enforces role-based access: only companies can create challenges
// and review submissions; only talent can submit entries.
//
// Endpoints:
//   GET    /challenges                          — list active challenges (paginated)
//   GET    /challenges/:id                      — get a single challenge with company info
//   POST   /challenges                          — create a challenge (company only)
//   POST   /challenges/:id/submit               — submit to a challenge (talent only)
//   GET    /challenges/:id/submissions          — list submissions (company only)
//   PATCH  /challenges/:id/submissions/:subId   — update submission status (company only)
//   GET    /health                              — health check
//
// AUTH: identity is provided by the API Gateway via x-user-id and x-account-type
// headers — this service trusts those headers and does NOT re-verify the JWT.
//
// NOTE: This is a standalone microservice in services/challenge-service/. The main
// frontend app (src/) manages challenges directly via Supabase — this service is
// for the microservices deployment model.
//
// KEYWORDS: AUTH, DATABASE, VALIDATION
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3004");

// DATABASE: service-role client — bypasses RLS for trusted server operations
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

/**
 * Extract the authenticated user's ID from the x-user-id header.
 * This header is injected by the API Gateway after JWT verification.
 * Returns undefined if the header is absent (unauthenticated request).
 */
function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

/**
 * Extract the user's account type from the x-account-type header.
 * Returns "talent" or "company" (injected by the API Gateway from the JWT).
 */
function accountType(req: { headers: Record<string, unknown> }) {
  return req.headers["x-account-type"] as string | undefined;
}

// Health check endpoint
app.get("/health", async () => ({ status: "ok", service: "challenge-service" }));

// ── List challenges ───────────────────────────────────────────────────────────

/**
 * List active challenges with optional filtering and pagination.
 * Returns challenges sorted by deadline (soonest first) so users see
 * time-sensitive opportunities prominently.
 *
 * DATABASE: reads `challenges` joined to `companies`, filtered to status=active.
 */
app.get("/challenges", async (request, reply) => {
  const { companyId, skill, page = "1", limit = "20" } = request.query as Record<string, string>;

  let query = supabase
    .from("challenges")
    .select("*, company:companies(id,name,initials,industry)")
    .eq("status", "active")
    .range((+page - 1) * +limit, +page * +limit - 1)
    .order("deadline_days", { ascending: true }); // soonest deadline first

  // Optional filter by company — used on a company's own challenge management page
  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query;
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ challenges: data, page: +page });
});

// ── Get challenge ─────────────────────────────────────────────────────────────

/**
 * Fetch a single challenge with full company details.
 *
 * DATABASE: reads one row from `challenges` joined to `companies`.
 */
app.get("/challenges/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { data, error } = await supabase
    .from("challenges")
    .select("*, company:companies(*)")
    .eq("id", id)
    .single();

  if (error) return reply.code(404).send({ error: "Challenge not found" });
  return reply.send(data);
});

// ── Create challenge (company only) ──────────────────────────────────────────

/**
 * VALIDATION: Zod schema for the challenge creation body.
 */
const CreateChallengeBody = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  deadlineDays: z.number().int().min(1), // number of days until the challenge closes
  requiredSkills: z.array(z.string()).min(1),
  prize: z.string().optional(),
});

/**
 * Create a new challenge posting.
 * AUTH: restricted to users with account_type = "company".
 * The company_id is looked up from the companies table using the authenticated
 * userId rather than trusting a company_id from the request body.
 *
 * AUTH: requires x-account-type = "company"
 * DATABASE: reads `companies` to find the company, then inserts into `challenges`.
 */
app.post("/challenges", async (request, reply) => {
  const uid = userId(request as any);
  // AUTH: only company accounts can create challenges
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Company accounts only" });

  // VALIDATION: parse request body
  const body = CreateChallengeBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  // DATABASE: look up the company record owned by this user
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", uid)
    .single();
  if (!company) return reply.code(403).send({ error: "Company profile not found" });

  // DATABASE: insert the new challenge
  const { data, error } = await supabase
    .from("challenges")
    .insert({
      ...body.data,
      company_id: company.id,
      status: "active",
      submissions: 0, // starts with zero submissions
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });
  return reply.code(201).send(data);
});

// ── Submit to challenge (talent only) ────────────────────────────────────────

/**
 * VALIDATION: Zod schema for a challenge submission body.
 * All fields are optional — talent can save a partial submission as a draft.
 */
const SubmitBody = z.object({
  walkthrough: z.string().optional(), // text explanation of their approach
  repoUrl: z.string().url().optional(), // link to code repository
  liveUrl: z.string().url().optional(), // link to deployed work
  notes: z.string().optional(),
});

/**
 * Submit a solution to a challenge.
 * Prevents duplicate submissions by checking if the talent has already submitted.
 * Calls a Postgres RPC to atomically increment the challenge's submission count.
 *
 * AUTH: requires x-account-type = "talent"
 * DATABASE: checks `submissions` for duplicates, then inserts and increments counter.
 */
app.post("/challenges/:id/submit", async (request, reply) => {
  const uid = userId(request as any);
  // AUTH: only talent accounts can submit
  if (!uid || accountType(request as any) !== "talent")
    return reply.code(403).send({ error: "Talent accounts only" });

  const { id } = request.params as { id: string };
  const body = SubmitBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  // DATABASE: check for an existing submission to prevent duplicates
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("challenge_id", id)
    .eq("talent_id", uid)
    .single();
  if (existing) return reply.code(409).send({ error: "Already submitted" }); // 409 Conflict

  // DATABASE: insert the submission
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      challenge_id: id,
      talent_id: uid,
      status: "submitted",
      ...body.data,
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });

  // DATABASE: atomically increment the challenge's submission counter via a Postgres function
  await supabase.rpc("increment_challenge_submissions", { challenge_id: id });
  return reply.code(201).send(data);
});

// ── List submissions for a challenge (company only) ───────────────────────────

/**
 * List all submissions for a challenge — for the company's review dashboard.
 * Includes the talent's profile so the company can see who submitted.
 *
 * AUTH: requires x-account-type = "company"
 * DATABASE: reads `submissions` joined to `profiles` (talent), for the given challenge.
 */
app.get("/challenges/:id/submissions", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Forbidden" });

  const { id } = request.params as { id: string };
  const { data, error } = await supabase
    .from("submissions")
    .select("*, talent:profiles(id,display_name,headline,avatar_url)")
    .eq("challenge_id", id)
    .order("created_at", { ascending: false });

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ submissions: data });
});

// ── Review submission (company only) ─────────────────────────────────────────

/**
 * Update a submission's status (e.g., move from "submitted" to "shortlisted").
 * Used by companies to manage their review pipeline.
 *
 * AUTH: requires x-account-type = "company"
 * DATABASE: updates `status` in `submissions` where id = submissionId.
 */
app.patch("/challenges/:id/submissions/:submissionId", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Forbidden" });

  const { submissionId } = request.params as { id: string; submissionId: string };
  const { status } = request.body as { status: "reviewed" | "shortlisted" | "rejected" };

  const { data, error } = await supabase
    .from("submissions")
    .update({ status })
    .eq("id", submissionId)
    .select()
    .single();
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send(data);
});

// Start the server
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Challenge Service running on port ${PORT}`);
});
