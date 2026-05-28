// =============================================================================
// index.ts — services/admin-service/src/index.ts
// =============================================================================
// Admin Service — user management, moderation queue, audit log.
//
// Endpoints:
//   GET    /admin/users                    — list all users (paginated)
//   PATCH  /admin/users/:id/suspend        — suspend a user
//   PATCH  /admin/users/:id/reinstate      — reinstate a suspended user
//   GET    /admin/moderation               — pending moderation queue
//   PATCH  /admin/moderation/:id           — approve or reject a moderation item
//   GET    /admin/audit-log                — recent admin actions
//   GET    /admin/contact                  — contact submissions
//   GET    /health
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3009");

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

async function isAdmin(uid: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .single();
  return !!data;
}

async function setUserStatus(
  adminId: string,
  targetId: string,
  status: string,
  action: string,
  reason?: string,
) {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", targetId);
  if (error) return error;
  await supabase
    .from("admin_audit_log")
    .insert({ admin_id: adminId, action, target_id: targetId, reason: reason ?? null });
  return null;
}

app.get("/health", async () => ({ status: "ok", service: "admin-service" }));

// ── List users ────────────────────────────────────────────────────────────────

/**
 * List all users with their profile and account status.
 * AUTH: admin only
 * DATABASE: reads `profiles`, `user_roles`
 */
app.get("/admin/users", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { page = "1", limit = "50", search } = request.query as Record<string, string>;

  let query = supabase
    .from("profiles")
    .select("id, display_name, email, account_type, status, created_at", { count: "exact" })
    .range((+page - 1) * +limit, +page * +limit - 1)
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("display_name", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ users: data, total: count, page: +page });
});

// ── Suspend user ──────────────────────────────────────────────────────────────

/**
 * Suspend a user account and log the admin action.
 * AUTH: admin only
 * DATABASE: updates `profiles`, inserts into `admin_audit_log`
 */
app.patch("/admin/users/:id/suspend", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { id } = request.params as { id: string };
  const { reason } = request.body as { reason?: string };

  const error = await setUserStatus(uid, id, "suspended", "suspend_user", reason);
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ success: true });
});

// ── Reinstate user ────────────────────────────────────────────────────────────

/**
 * Reinstate a suspended user and log the admin action.
 * AUTH: admin only
 * DATABASE: updates `profiles`, inserts into `admin_audit_log`
 */
app.patch("/admin/users/:id/reinstate", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { id } = request.params as { id: string };

  const error = await setUserStatus(uid, id, "active", "reinstate_user");
  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ success: true });
});

// ── Moderation queue ──────────────────────────────────────────────────────────

/**
 * List items pending admin review — unreviewed challenge submissions.
 * AUTH: admin only
 * DATABASE: reads `submissions` with status=submitted (same source as db.ts fetchModerationQueue)
 */
app.get("/admin/moderation", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { data, error } = await supabase
    .from("submissions")
    .select("*, challenge:challenges(*), talent:profiles!talent_id(id,display_name,avatar_url)")
    .eq("status", "submitted")
    .order("created_at", { ascending: true });

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ items: data });
});

// ── Review moderation item ────────────────────────────────────────────────────

const ModerationBody = z.object({
  status: z.enum(["reviewed", "shortlisted", "rejected"]),
  notes: z.string().optional(),
});

/**
 * Review a submission (approve/shortlist/reject).
 * AUTH: admin only
 * DATABASE: updates `submissions`, inserts into `admin_audit_log`
 */
app.patch("/admin/moderation/:id", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { id } = request.params as { id: string };
  const body = ModerationBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { error } = await supabase
    .from("submissions")
    .update({ status: body.data.status })
    .eq("id", id);

  if (error) return reply.code(500).send({ error: error.message });

  await supabase.from("admin_audit_log").insert({
    admin_id: uid,
    action: `moderation_${body.data.status}`,
    target_id: id,
  });

  return reply.send({ success: true });
});

// ── Audit log ─────────────────────────────────────────────────────────────────

/**
 * Fetch recent admin actions for audit purposes.
 * AUTH: admin only
 * DATABASE: reads `admin_audit_log`
 */
app.get("/admin/audit-log", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { limit = "100" } = request.query as Record<string, string>;

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*, admin:profiles!admin_id(display_name)")
    .order("created_at", { ascending: false })
    .limit(+limit);

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ log: data });
});

// ── Contact submissions ───────────────────────────────────────────────────────

/**
 * List contact form submissions for admin review.
 * AUTH: admin only
 * DATABASE: reads `contact_submissions`
 */
app.get("/admin/contact", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { data, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ submissions: data });
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Admin Service running on port ${PORT}`);
});
