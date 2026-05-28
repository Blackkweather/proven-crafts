// =============================================================================
// index.ts — services/auth-service/src/index.ts
// =============================================================================
// The Auth Service microservice — a standalone Node.js/Fastify HTTP server
// that handles user registration, login, session refresh, password reset, and
// onboarding data persistence.
//
// This service uses the Supabase SERVICE ROLE key so it can create users,
// assign roles, and read any profile without RLS restrictions. It should
// NEVER be exposed directly to the internet — it sits behind the API Gateway
// which validates JWTs and injects the x-user-id header.
//
// Endpoints:
//   POST /auth/signup          — register a new talent or company account
//   POST /auth/signin          — sign in with email + password, returns JWT
//   POST /auth/refresh         — exchange a refresh token for a new access token
//   POST /auth/forgot-password — send a password reset email
//   GET  /auth/me              — get the current user's profile + roles
//   POST /auth/onboarding      — save initial onboarding data
//   GET  /health               — health check
//
// NOTE: This is a standalone microservice in services/auth-service/. The main
// frontend app (src/) talks to Supabase Auth directly — this service is for
// the microservices deployment model.
//
// KEYWORDS: AUTH, DATABASE, VALIDATION
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3001");

// DATABASE: Supabase admin client — uses service role key to bypass RLS.
// Required for admin operations like creating users and assigning roles.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const app = Fastify({ logger: { level: "info" } });

// MIDDLEWARE: open CORS — this service is only called from the API Gateway,
// not directly from browsers, so we allow all origins here
await app.register(cors, { origin: true });

// Health check endpoint for load balancers and Docker health checks
app.get("/health", async () => ({ status: "ok", service: "auth-service" }));

// ── Sign up ──────────────────────────────────────────────────────────────────

/**
 * VALIDATION: Zod schema for signup request body.
 * Enforces minimum field lengths and valid email format before hitting Supabase.
 */
const SignUpBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8), // minimum 8 chars — Supabase also enforces this server-side
  accountType: z.enum(["talent", "company"]),
});

/**
 * Register a new user account.
 * Creates the auth.users row, then inserts a profiles row and a user_roles row.
 * We do this in the service (with the service role key) rather than in triggers
 * so the logic is explicit and easy to debug.
 *
 * AUTH: creates the user via Supabase Admin API (bypasses email confirmation for now)
 * DATABASE: inserts into `profiles` and `user_roles`
 */
app.post("/auth/signup", async (request, reply) => {
  // VALIDATION: parse and validate the body
  const body = SignUpBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { name, email, password, accountType } = body.data;

  // AUTH: create the Supabase Auth user — `email_confirm: false` skips email verification
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { display_name: name, account_type: accountType },
  });

  if (error) return reply.code(400).send({ error: error.message });

  // DATABASE: insert the profile row that the rest of the app reads
  await supabase.from("profiles").insert({
    id: data.user.id,
    display_name: name,
    account_type: accountType,
    headline: "",
    bio: "",
  });

  // DATABASE: assign the user's role (talent or company) — used by RLS policies
  await supabase.from("user_roles").insert({ user_id: data.user.id, role: accountType });

  return reply.code(201).send({ userId: data.user.id });
});

// ── Sign in ──────────────────────────────────────────────────────────────────

/**
 * VALIDATION: Zod schema for sign-in request body.
 */
const SignInBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Sign in with email and password.
 * Returns access token, refresh token, expiry, and basic user info.
 * The access token is a Supabase JWT that the API Gateway will verify on subsequent requests.
 *
 * AUTH: calls Supabase Auth signInWithPassword
 */
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

/**
 * Exchange a refresh token for a new access token.
 * Called automatically by the frontend when the access token is about to expire.
 * Refresh tokens are long-lived and stored securely; access tokens are short-lived JWTs.
 *
 * AUTH: calls Supabase Auth refreshSession
 */
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

const ALLOWED_REDIRECT_ORIGINS = [
  process.env.FRONTEND_URL ?? "http://localhost:8080",
];

const ForgotPasswordBody = z.object({
  email: z.string().email(),
  redirectTo: z.string().url(),
});

/**
 * Send a password reset email to the user.
 * redirectTo is validated against the allowlist to prevent open-redirect phishing.
 *
 * AUTH: calls Supabase Auth resetPasswordForEmail
 */
app.post("/auth/forgot-password", async (request, reply) => {
  const body = ForgotPasswordBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { email, redirectTo } = body.data;

  // Validate redirectTo is on an allowed origin — prevents phishing via crafted reset links
  const origin = new URL(redirectTo).origin;
  if (!ALLOWED_REDIRECT_ORIGINS.includes(origin)) {
    return reply.code(400).send({ error: "Invalid redirectTo URL" });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return reply.code(400).send({ error: error.message });
  return reply.send({ ok: true });
});

// ── Get current user (requires x-user-id from gateway) ───────────────────────

/**
 * Get the current user's profile and roles.
 * The x-user-id header is injected by the API Gateway after JWT verification —
 * we trust it here because this service is only accessible via the gateway.
 *
 * AUTH: trusts the x-user-id header set by the API Gateway
 * DATABASE: reads `profiles` and `user_roles` for the given userId
 */
app.get("/auth/me", async (request, reply) => {
  const userId = (request.headers as Record<string, string>)["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  // Fetch profile and roles in parallel for efficiency
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  return reply.send({ profile, roles: roles?.map((r) => r.role) ?? [] });
});

// ── Save onboarding data ──────────────────────────────────────────────────────

/**
 * Persist initial onboarding data for a user.
 * Currently serialises the full body as JSON into the `bio` column as a
 * temporary store — a more structured approach would use dedicated columns.
 *
 * AUTH: trusts the x-user-id header from the API Gateway
 * DATABASE: updates `profiles` for the given userId
 */
app.post("/auth/onboarding", async (request, reply) => {
  const userId = (request.headers as Record<string, string>)["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const body = request.body as Record<string, unknown>;

  // DATABASE: update the profile with the onboarding data
  await supabase
    .from("profiles")
    .update({
      headline: (body.role as string) ?? "",
      bio: JSON.stringify(body), // serialised for now — consider structured columns for production
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return reply.send({ ok: true });
});

// Start the server
app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Auth Service running on port ${PORT}`);
});
