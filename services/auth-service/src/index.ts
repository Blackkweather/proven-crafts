import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3001");
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const app = Fastify({ logger: { level: "info" } });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ status: "ok", service: "auth-service" }));

// ── Sign up ──────────────────────────────────────────────────────────────────
const SignUpBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  accountType: z.enum(["talent", "company"]),
});

app.post("/auth/signup", async (request, reply) => {
  const body = SignUpBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { name, email, password, accountType } = body.data;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { display_name: name, account_type: accountType },
  });

  if (error) return reply.code(400).send({ error: error.message });

  // Insert profile row
  await supabase.from("profiles").insert({
    id: data.user.id,
    display_name: name,
    account_type: accountType,
    headline: "",
    bio: "",
  });

  // Assign role
  await supabase.from("user_roles").insert({ user_id: data.user.id, role: accountType });

  return reply.code(201).send({ userId: data.user.id });
});

// ── Sign in ──────────────────────────────────────────────────────────────────
const SignInBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.post("/auth/signin", async (request, reply) => {
  const body = SignInBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data, error } = await supabase.auth.signInWithPassword(body.data);
  if (error) return reply.code(401).send({ error: error.message });

  return reply.send({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
      accountType: data.user.user_metadata?.account_type,
    },
  });
});

// ── Refresh token ─────────────────────────────────────────────────────────────
app.post("/auth/refresh", async (request, reply) => {
  const { refreshToken } = request.body as { refreshToken: string };
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error) return reply.code(401).send({ error: error.message });
  return reply.send({
    accessToken: data.session!.access_token,
    expiresAt: data.session!.expires_at,
  });
});

// ── Forgot password ───────────────────────────────────────────────────────────
app.post("/auth/forgot-password", async (request, reply) => {
  const { email, redirectTo } = request.body as { email: string; redirectTo: string };
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return reply.code(400).send({ error: error.message });
  return reply.send({ ok: true });
});

// ── Get current user (requires x-user-id from gateway) ───────────────────────
app.get("/auth/me", async (request, reply) => {
  const userId = (request.headers as Record<string, string>)["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  return reply.send({ profile, roles: roles?.map((r) => r.role) ?? [] });
});

// ── Save onboarding data ──────────────────────────────────────────────────────
app.post("/auth/onboarding", async (request, reply) => {
  const userId = (request.headers as Record<string, string>)["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const body = request.body as Record<string, unknown>;

  await supabase
    .from("profiles")
    .update({
      headline: (body.role as string) ?? "",
      bio: JSON.stringify(body),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return reply.send({ ok: true });
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Auth Service running on port ${PORT}`);
});
