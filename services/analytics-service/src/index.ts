// =============================================================================
// index.ts — services/analytics-service/src/index.ts
// =============================================================================
// Analytics Service — pipeline stats, profile views, submission counts.
//
// Endpoints:
//   GET  /analytics/company/:id   — company dashboard metrics
//   GET  /analytics/talent/:id    — talent profile view & application stats
//   GET  /analytics/market        — aggregate market rate intelligence
//   GET  /health
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";

const PORT = parseInt(process.env.PORT ?? "3007");

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

function accountType(req: { headers: Record<string, unknown> }) {
  return req.headers["x-account-type"] as string | undefined;
}

app.get("/health", async () => ({ status: "ok", service: "analytics-service" }));

// ── Company analytics ─────────────────────────────────────────────────────────

/**
 * Company dashboard: submission counts per stage, active challenge count,
 * shortlisted talent, recent pipeline activity.
 * AUTH: requires x-account-type = "company" and must own the queried company
 * DATABASE: reads `submissions`, `challenges`, `companies`
 */
app.get("/analytics/company/:id", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Forbidden" });

  const { id } = request.params as { id: string };

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", uid)
    .eq("id", id)
    .single();
  if (!company) return reply.code(403).send({ error: "Company not found or not owned by you" });

  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, status")
    .eq("company_id", id);

  const challengeIds = (challenges ?? []).map((c) => c.id);
  const { data: submissions } = await supabase
    .from("submissions")
    .select("status, created_at")
    .in("challenge_id", challengeIds);

  const pipeline = submissions.reduce(
    (acc: Record<string, number>, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return reply.send({
    activeChallenges: challenges.filter((c) => c.status === "active").length,
    totalSubmissions: submissions.length,
    pipeline,
  });
});

// ── Talent analytics ──────────────────────────────────────────────────────────

/**
 * Talent dashboard: profile view count, application/submission counts,
 * shortlist rate.
 * AUTH: x-user-id must match the talent's profile owner
 * DATABASE: reads `profile_views`, `submissions`
 */
app.get("/analytics/talent/:id", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };
  if (uid !== id) return reply.code(403).send({ error: "Forbidden" });

  const [viewsRes, submissionsRes] = await Promise.all([
    supabase
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("talent_id", id),
    supabase.from("submissions").select("status").eq("talent_id", id),
  ]);

  const submissions = submissionsRes.data ?? [];
  const shortlisted = submissions.filter((s) => s.status === "shortlisted").length;

  return reply.send({
    profileViews: viewsRes.count ?? 0,
    totalSubmissions: submissions.length,
    shortlisted,
    shortlistRate:
      submissions.length > 0
        ? Math.round((shortlisted / submissions.length) * 100)
        : 0,
  });
});

// ── Market intelligence ───────────────────────────────────────────────────────

/**
 * Aggregate market rate data across all talent profiles.
 * Public endpoint — no auth required.
 * DATABASE: reads `profiles` for salary/rate fields
 */
app.get("/analytics/market", async (_request, reply) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("skills, desired_salary_min, desired_salary_max")
    .not("desired_salary_min", "is", null);

  if (error) return reply.code(500).send({ error: error.message });

  const profiles = data ?? [];
  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const mins = profiles.map((p) => p.desired_salary_min).filter(Boolean) as number[];
  const maxs = profiles.map((p) => p.desired_salary_max).filter(Boolean) as number[];

  return reply.send({
    talentCount: profiles.length,
    avgSalaryMin: avg(mins),
    avgSalaryMax: avg(maxs),
  });
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Analytics Service running on port ${PORT}`);
});
