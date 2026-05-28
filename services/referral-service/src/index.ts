// =============================================================================
// index.ts — services/referral-service/src/index.ts
// =============================================================================
// Referral Service — track and reward user referrals.
//
// Endpoints:
//   GET  /referrals/stats/:userId  — get referral stats for a user
//   POST /referrals/record         — record a new referral
//   GET  /referrals/leaderboard    — top referrers (public)
//   GET  /health
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3011");

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

app.get("/health", async () => ({ status: "ok", service: "referral-service" }));

// ── Referral stats ────────────────────────────────────────────────────────────

/**
 * Get referral stats for a user: total referrals, successful conversions, rewards earned.
 * AUTH: user can only view their own stats
 * DATABASE: reads `referrals`
 */
app.get("/referrals/stats/:userId", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { userId: targetId } = request.params as { userId: string };
  if (uid !== targetId) return reply.code(403).send({ error: "Forbidden" });

  const { data, error } = await supabase
    .from("referrals")
    .select("id, status, created_at")
    .eq("referrer_id", targetId);

  if (error) return reply.code(500).send({ error: error.message });

  const referrals = data ?? [];
  return reply.send({
    total: referrals.length,
    converted: referrals.filter((r) => r.status === "converted").length,
    pending: referrals.filter((r) => r.status === "pending").length,
  });
});

// ── Record referral ───────────────────────────────────────────────────────────

const RecordReferralBody = z.object({
  referrerId: z.string().uuid(),
  referredEmail: z.string().email(),
});

/**
 * Record that a user was referred by another user.
 * Prevents duplicate referrals for the same email.
 * DATABASE: inserts into `referrals`
 */
app.post("/referrals/record", async (request, reply) => {
  const body = RecordReferralBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  // Prevent duplicate referrals for the same email
  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_email", body.data.referredEmail)
    .single();

  if (existing) return reply.code(409).send({ error: "Email already referred" });

  const { data, error } = await supabase
    .from("referrals")
    .insert({
      referrer_id: body.data.referrerId,
      referred_email: body.data.referredEmail,
      status: "pending",
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });
  return reply.code(201).send(data);
});

// ── Leaderboard ───────────────────────────────────────────────────────────────

/**
 * Top 10 referrers by converted referral count. Public endpoint.
 * DATABASE: reads `referrals`, joined to `profiles`
 */
app.get("/referrals/leaderboard", async (_request, reply) => {
  const { data, error } = await supabase
    .from("referrals")
    .select("referrer_id, referrer:profiles!referrer_id(display_name, avatar_url)")
    .eq("status", "converted");

  if (error) return reply.code(500).send({ error: error.message });

  const counts: Record<string, { count: number; profile: unknown }> = {};
  for (const r of data ?? []) {
    if (!counts[r.referrer_id]) counts[r.referrer_id] = { count: 0, profile: r.referrer };
    counts[r.referrer_id].count++;
  }

  const leaderboard = Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, { count, profile }]) => ({ id, count, profile }));

  return reply.send({ leaderboard });
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Referral Service running on port ${PORT}`);
});
