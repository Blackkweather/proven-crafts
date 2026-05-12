// =============================================================================
// index.ts — services/jobs-service/src/index.ts
// =============================================================================
// The Jobs Service microservice — a standalone Node.js/Fastify HTTP server
// that manages job postings and applications.
//
// Companies post jobs, talent applies. This service enforces role-based access:
// only companies can create/update/close jobs; only talent can apply.
//
// Endpoints:
//   GET    /jobs                    — list active jobs (paginated, filterable)
//   GET    /jobs/:id                — get a single job with company info
//   POST   /jobs                    — create a job posting (company only)
//   PATCH  /jobs/:id                — update a job (company only)
//   DELETE /jobs/:id                — close a job / soft delete (company only)
//   POST   /jobs/:id/apply          — apply to a job (talent only)
//   GET    /jobs/:id/applications   — list applications for a job (company only)
//   GET    /health                  — health check
//
// AUTH: identity is provided by the API Gateway via x-user-id and x-account-type
// headers — this service trusts those headers and does NOT re-verify the JWT.
//
// NOTE: This is a standalone microservice in services/jobs-service/. The main
// frontend app (src/) manages jobs directly via Supabase — this service is
// for the microservices deployment model.
//
// KEYWORDS: AUTH, DATABASE, VALIDATION
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3002");

// DATABASE: service-role client — bypasses RLS for trusted server operations
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the authenticated user's ID from the x-user-id header.
 * Injected by the API Gateway after JWT verification.
 */
function userId(request: { headers: Record<string, unknown> }) {
  return request.headers["x-user-id"] as string | undefined;
}

/**
 * Extract the user's account type (talent or company) from the x-account-type header.
 * Injected by the API Gateway from the JWT's app_metadata.
 */
function accountType(request: { headers: Record<string, unknown> }) {
  return request.headers["x-account-type"] as string | undefined;
}

// Health check
app.get("/health", async () => ({ status: "ok", service: "jobs-service" }));

// ── List jobs ─────────────────────────────────────────────────────────────────

/**
 * List active job postings with optional filters and pagination.
 * Sorted newest first so the most recently posted jobs appear at the top.
 *
 * DATABASE: reads `jobs` joined to `companies`, filtered to status=active.
 */
app.get("/jobs", async (request, reply) => {
  const {
    skill,
    arrangement, // "Remote" | "Hybrid" | "Onsite"
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

  // Optional filters
  if (companyId) query = query.eq("company_id", companyId);
  if (arrangement) query = query.eq("arrangement", arrangement);

  const { data, error } = await query;
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ jobs: data, page: +page });
});

// ── Get single job ────────────────────────────────────────────────────────────

/**
 * Fetch a single job with full company details.
 *
 * DATABASE: reads one row from `jobs` joined to `companies`.
 */
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

/**
 * VALIDATION: Zod schema for job creation.
 */
const CreateJobBody = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  location: z.string(),
  arrangement: z.enum(["Remote", "Hybrid", "Onsite"]),
  comp: z.string(), // compensation / salary range as a display string
  requiredSkills: z.array(z.string()).min(1),
});

/**
 * Create a new job posting.
 * Looks up the company_id from the companies table using the authenticated
 * userId — never trusts a company_id from the request body to prevent spoofing.
 *
 * AUTH: requires x-account-type = "company"
 * DATABASE: reads `companies` to find the company, then inserts into `jobs`.
 */
app.post("/jobs", async (request, reply) => {
  const uid = userId(request as any);
  // AUTH: only company accounts can post jobs
  if (!uid || accountType(request as any) !== "company") {
    return reply.code(403).send({ error: "Company accounts only" });
  }

  // VALIDATION: parse body
  const body = CreateJobBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  // DATABASE: look up the company owned by this user
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", uid)
    .single();
  if (!company) return reply.code(403).send({ error: "Company profile not found" });

  // DATABASE: insert the job
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...body.data,
      company_id: company.id,
      status: "active",
      posted_days: 0,  // starts at 0 days posted
      applicants: 0,   // starts with no applicants
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });
  return reply.code(201).send(data);
});

// ── Update job ────────────────────────────────────────────────────────────────

/**
 * Update a job posting (e.g., change the title, salary, or status).
 * Only company accounts are allowed to update jobs.
 * NOTE: this does not verify the company owns the specific job — consider adding
 * that check in production to prevent one company editing another's job.
 *
 * AUTH: requires x-account-type = "company"
 * DATABASE: updates `jobs` where id = jobId.
 */
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

/**
 * Close a job (soft delete by setting status = "closed").
 * We don't hard-delete so historical application data is preserved.
 *
 * AUTH: requires x-account-type = "company"
 * DATABASE: updates `status` to "closed" in `jobs` where id = jobId.
 */
app.delete("/jobs/:id", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Forbidden" });

  const { id } = request.params as { id: string };
  await supabase.from("jobs").update({ status: "closed" }).eq("id", id);
  return reply.send({ ok: true });
});

// ── Apply to job ──────────────────────────────────────────────────────────────

/**
 * Apply to a job posting.
 * Prevents duplicate applications by checking for an existing row first.
 * Calls a Postgres RPC to atomically increment the job's applicant count.
 *
 * AUTH: requires x-account-type = "talent"
 * DATABASE: checks `applications` for duplicates, inserts application, increments counter.
 */
app.post("/jobs/:id/apply", async (request, reply) => {
  const uid = userId(request as any);
  // AUTH: only talent accounts can apply
  if (!uid || accountType(request as any) !== "talent")
    return reply.code(403).send({ error: "Talent accounts only" });

  const { id } = request.params as { id: string };
  const { coverNote } = request.body as { coverNote?: string };

  // DATABASE: check for duplicate application
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("job_id", id)
    .eq("talent_id", uid)
    .single();
  if (existing) return reply.code(409).send({ error: "Already applied" }); // 409 Conflict

  // DATABASE: insert the application
  const { data, error } = await supabase
    .from("applications")
    .insert({
      job_id: id,
      talent_id: uid,
      status: "new", // initial pipeline stage
      cover_note: coverNote ?? "",
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });

  // DATABASE: atomically increment job applicant count via Postgres function
  await supabase.rpc("increment_job_applicants", { job_id: id });
  return reply.code(201).send(data);
});

// ── List applications for a job (company only) ────────────────────────────────

/**
 * List all applications for a job — for the company's hiring pipeline view.
 * Includes the talent's profile so companies can see who applied.
 *
 * AUTH: requires x-account-type = "company"
 * DATABASE: reads `applications` joined to `profiles` (talent), for the given job.
 */
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

// Start the server
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Jobs Service running on port ${PORT}`);
});
