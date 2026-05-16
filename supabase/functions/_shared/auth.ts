// =============================================================================
// auth.ts — supabase/functions/_shared/auth.ts
// =============================================================================
// Shared utilities for all Supabase Edge Functions.
//
// Provides:
//   - CORS helpers (corsHeaders, corsPreflightResponse)
//   - HTTP response helpers (errorResponse, successResponse)
//   - JWT authentication (requireAuth)
//   - AuthError — typed error class for auth failures
//   - aiRateLimiter — in-memory rate limiter (20 calls/user/minute)
//
// CORS behavior:
//   Production: set ALLOWED_ORIGINS env var (comma-separated list of origins).
//               Requests from unlisted origins will be blocked by the browser.
//   Development: if ALLOWED_ORIGINS is unset, only localhost origins are
//               allowed (http://localhost:* on common dev ports). This prevents
//               the wildcard-open behavior from leaking into production.
//
// KEYWORDS: AUTH, MIDDLEWARE, API
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RAW_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") ?? "";

// Development-only fallback origins. Never used when ALLOWED_ORIGINS is set.
const DEV_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8787",
  "http://localhost:4173",
]);

/**
 * Allowed CORS origins. In production, set ALLOWED_ORIGINS to a comma-separated
 * list of your app's origins. If unset, only localhost dev ports are allowed —
 * failing closed rather than open for any unrecognised origin.
 */
const ALLOWED_ORIGINS: Set<string> = RAW_ORIGINS.trim().length > 0
  ? new Set(RAW_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean))
  : DEV_ORIGINS;

/**
 * Build CORS response headers for a given request origin.
 * Only reflects the origin back if it's in the allowed set.
 * Unlisted origins receive "null", which the browser treats as a blocked response.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function corsPreflightResponse(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("Origin")),
  });
}

export function errorResponse(
  message: string,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export function successResponse(data: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

/**
 * Verify the Bearer JWT in the request and return the authenticated user.
 * Throws AuthError if the token is missing, malformed, or invalid.
 */
export async function requireAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or malformed Authorization header.");
  }

  const token = authHeader.slice(7);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError("Invalid or expired token.");
  }

  return data.user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * In-memory rate limiter for per-user request throttling.
 * NOTE: State is per-worker-instance and resets on cold start.
 * For strict multi-worker rate limiting, use a persistent store.
 */
class RateLimiter {
  private counts = new Map<string, { n: number; resetAt: number }>();

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(key);

    // Opportunistically clean up expired entries to prevent memory growth
    if (entry && now >= entry.resetAt) {
      this.counts.delete(key);
    }

    const current = this.counts.get(key);
    if (!current) {
      this.counts.set(key, { n: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (current.n >= this.maxPerWindow) return false;
    current.n++;
    return true;
  }
}

// 20 AI calls per user per minute
export const aiRateLimiter = new RateLimiter(20, 60_000);
