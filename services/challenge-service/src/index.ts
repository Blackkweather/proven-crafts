import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3004");
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}
function accountType(req: { headers: Record<string, unknown> }) {
  return req.headers["x-account-type"] as string | undefined;
}

app.get("/health", async () => ({ status: "ok", service: "challenge-service" }));

// ── List challenges ───────────────────────────────────────────────────────────
app.get("/challenges", async (request, reply) => {
  const { companyId, skill, page = "1", limit = "20" } = request.query as Record<string, string>;

  let query = supabase
    .from("challenges")
    .select("*, company:companies(id,name,initials,industry)")
    .eq("status", "active")
    .range((+page - 1) * +limit, +page * +limit - 1)
    .order("deadline_days", { ascending: true });

  if (companyId) query = query.eq("company_id", companyId);

  const { data, error } = await query;
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ challenges: data, page: +page });
});

// ── Get challenge ─────────────────────────────────────────────────────────────
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
const CreateChallengeBody = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  deadlineDays: z.number().int().min(1),
  requiredSkills: z.array(z.string()).min(1),
  prize: z.string().optional(),
});

app.post("/challenges", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Company accounts only" });

  const body = CreateChallengeBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", uid)
    .single();
  if (!company) return reply.code(403).send({ error: "Company profile not found" });

  const { data, error } = await supabase
    .from("challenges")
    .insert({
      ...body.data,
      company_id: company.id,
      status: "active",
      submissions: 0,
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });
  return reply.code(201).send(data);
});

// ── Submit to challenge (talent only) ────────────────────────────────────────
const SubmitBody = z.object({
  walkthrough: z.string().optional(),
  repoUrl: z.string().url().optional(),
  liveUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

app.post("/challenges/:id/submit", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "talent")
    return reply.code(403).send({ error: "Talent accounts only" });

  const { id } = request.params as { id: string };
  const body = SubmitBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("challenge_id", id)
    .eq("talent_id", uid)
    .single();
  if (existing) return reply.code(409).send({ error: "Already submitted" });

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
  await supabase.rpc("increment_challenge_submissions", { challenge_id: id });
  return reply.code(201).send(data);
});

// ── List submissions for a challenge (company only) ───────────────────────────
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

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Challenge Service running on port ${PORT}`);
});
