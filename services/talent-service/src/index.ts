import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3003");
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

function userId(request: { headers: Record<string, unknown> }) {
  return request.headers["x-user-id"] as string | undefined;
}

app.get("/health", async () => ({ status: "ok", service: "talent-service" }));

// ── Match score algorithm ─────────────────────────────────────────────────────
// Returns 0-100 based on how many required skills the talent has (weighted by proficiency)
function computeMatchScore(
  talentSkills: { name: string; level: string }[],
  requiredSkills: string[],
): number {
  if (!requiredSkills.length) return 0;
  const WEIGHTS: Record<string, number> = {
    expert: 1,
    advanced: 0.85,
    proficient: 0.6,
    foundational: 0.3,
  };
  const talentMap = new Map(
    talentSkills.map((s) => [s.name.toLowerCase(), WEIGHTS[s.level] ?? 0.5]),
  );
  const score = requiredSkills.reduce(
    (sum, skill) => sum + (talentMap.get(skill.toLowerCase()) ?? 0),
    0,
  );
  return Math.round((score / requiredSkills.length) * 100);
}

// ── List talent (company/admin only) ─────────────────────────────────────────
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
const UpdateProfileBody = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

app.patch("/talent/:id", async (request, reply) => {
  const uid = userId(request as any);
  const { id } = request.params as { id: string };
  if (!uid || uid !== id)
    return reply.code(403).send({ error: "You can only update your own profile" });

  const body = UpdateProfileBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

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
app.get("/talent/:id/match", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { jobId, challengeId } = request.query as { jobId?: string; challengeId?: string };

  if (!jobId && !challengeId)
    return reply.code(400).send({ error: "jobId or challengeId required" });

  // Fetch talent skills from profile metadata
  const { data: profile } = await supabase.from("profiles").select("bio").eq("id", id).single();
  const onboardingData = (() => {
    try {
      return JSON.parse(profile?.bio ?? "{}");
    } catch {
      return {};
    }
  })();
  const talentSkills: { name: string; level: string }[] = onboardingData.skills ?? [];

  // Fetch required skills from job or challenge
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

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Talent Service running on port ${PORT}`);
});
