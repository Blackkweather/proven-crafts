// =============================================================================
// index.ts — services/contact-service/src/index.ts
// =============================================================================
// Contact Service — handle contact form submissions and email notifications.
//
// Endpoints:
//   POST /contact          — submit a contact form
//   GET  /contact          — list submissions (admin only)
//   GET  /health
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3012");

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

app.get("/health", async () => ({ status: "ok", service: "contact-service" }));

// ── Submit contact form ───────────────────────────────────────────────────────

const ContactBody = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
  type: z.enum(["general", "support", "partnership", "feedback"]).default("general"),
});

/**
 * Submit a contact form. Public endpoint — no auth required.
 * Stores the submission and triggers an email notification via Edge Function.
 * DATABASE: inserts into `contact_submissions`
 */
app.post("/contact", async (request, reply) => {
  const body = ContactBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data, error } = await supabase
    .from("contact_submissions")
    .insert({
      name: body.data.name,
      email: body.data.email,
      subject: body.data.subject,
      message: body.data.message,
      type: body.data.type,
      status: "new",
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });

  // Trigger email notification via Edge Function (fire-and-forget)
  supabase.functions
    .invoke("send-contact-notification", { body: { submissionId: data.id } })
    .catch(() => {}); // don't fail the request if email fails

  return reply.code(201).send({ success: true, id: data.id });
});

// ── List contact submissions ──────────────────────────────────────────────────

/**
 * List all contact form submissions for admin review.
 * AUTH: admin only
 * DATABASE: reads `contact_submissions`
 */
app.get("/contact", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || !(await isAdmin(uid))) return reply.code(403).send({ error: "Admins only" });

  const { status, page = "1", limit = "50" } = request.query as Record<string, string>;

  let query = supabase
    .from("contact_submissions")
    .select("*", { count: "exact" })
    .range((+page - 1) * +limit, +page * +limit - 1)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return reply.code(500).send({ error: error.message });

  return reply.send({ submissions: data, total: count, page: +page });
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Contact Service running on port ${PORT}`);
});
