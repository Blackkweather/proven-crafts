import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3002");
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
function userId(request: { headers: Record<string, unknown> }) {
  return request.headers["x-user-id"] as string | undefined;
}
function accountType(request: { headers: Record<string, unknown> }) {
  return request.headers["x-account-type"] as string | undefined;
}

app.get("/health", async () => ({ status: "ok", service: "jobs-service" }));

// ── List jobs ─────────────────────────────────────────────────────────────────
app.get("/jobs", async (request, reply) => {
  const {
    skill,
    arrangement,
    companyId,
    page = "1",
    limit = "20",
  } = request.query as Record<string, string>;

  let query = supabase
    .from("jobs")
    .select("*, company:companies(id,name,initials,industry)")
    .eq("status", "active")
    .range((+page - 1) * +limit, +page * +limit - 1)
    .order("created_at", { ascending: false });

  if (companyId) query = query.eq("company_id", companyId);
  if (arrangement) query = query.eq("arrangement", arrangement);

  const { data, error } = await query;
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ jobs: data, page: +page });
});

// ── Get single job ────────────────────────────────────────────────────────────
app.get("/jobs/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { data, error } = await supabase
    .from("jobs")
    .select("*, company:companies(*)")
    .eq("id", id)
    .single();

  if (error) return reply.code(404).send({ error: "Job not found" });
  return reply.send(data);
});

// ── Create job (company only) ─────────────────────────────────────────────────
const CreateJobBody = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  location: z.string(),
  arrangement: z.enum(["Remote", "Hybrid", "Onsite"]),
  comp: z.string(),
  requiredSkills: z.array(z.string()).min(1),
});

app.post("/jobs", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company") {
    return reply.code(403).send({ error: "Company accounts only" });
  }

  const body = CreateJobBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", uid)
    .single();
  if (!company) return reply.code(403).send({ error: "Company profile not found" });

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...body.data,
      company_id: company.id,
      status: "active",
      posted_days: 0,
      applicants: 0,
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });
  return reply.code(201).send(data);
});

// ── Update job ────────────────────────────────────────────────────────────────
app.patch("/jobs/:id", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Forbidden" });

  const { id } = request.params as { id: string };
  const { data, error } = await supabase
    .from("jobs")
    .update(request.body as object)
    .eq("id", id)
    .select()
    .single();
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send(data);
});

// ── Close job ─────────────────────────────────────────────────────────────────
app.delete("/jobs/:id", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Forbidden" });

  const { id } = request.params as { id: string };
  await supabase.from("jobs").update({ status: "closed" }).eq("id", id);
  return reply.send({ ok: true });
});

// ── Apply to job ──────────────────────────────────────────────────────────────
app.post("/jobs/:id/apply", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "talent")
    return reply.code(403).send({ error: "Talent accounts only" });

  const { id } = request.params as { id: string };
  const { coverNote } = request.body as { coverNote?: string };

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", id)
    .eq("talent_id", uid)
    .single();
  if (existing) return reply.code(409).send({ error: "Already applied" });

  const { data, error } = await supabase
    .from("applications")
    .insert({
      job_id: id,
      talent_id: uid,
      status: "new",
      cover_note: coverNote ?? "",
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });
  await supabase.rpc("increment_job_applicants", { job_id: id });
  return reply.code(201).send(data);
});

// ── List applications for a job (company only) ────────────────────────────────
app.get("/jobs/:id/applications", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Forbidden" });

  const { id } = request.params as { id: string };
  const { data, error } = await supabase
    .from("applications")
    .select("*, talent:profiles(id,display_name,headline,avatar_url)")
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ applications: data });
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Jobs Service running on port ${PORT}`);
});
