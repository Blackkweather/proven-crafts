// =============================================================================
// auth.ts — supabase/functions/_shared/auth.ts
// =============================================================================
// Shared utilities for all Supabase Edge Functions. This file runs on Supabase's
// Deno runtime (NOT Node.js), so imports use Deno-style JSR URLs (jsr:@...).
//
// Provides:
//   - CORS helpers (corsHeaders, corsPreflightResponse) — required for browser
//     requests to edge functions, which are on a different origin than the app
//   - HTTP response helpers (errorResponse, successResponse)
//   - JWT authentication (requireAuth) — verifies a Bearer token and returns the user
//   - AuthError — a typed error class for auth failures
//   - aiRateLimiter — an in-memory rate limiter (20 calls/user/minute)
//
// Every edge function should import from here rather than duplicating this logic.
//
// NOTE: Rate limiter state is per-Deno-worker-instance and resets on cold start.
// For production-grade rate limiting, consider a persistent store (Redis/Supabase table).
//
// KEYWORDS: AUTH, MIDDLEWARE, API
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// These are set as Supabase edge function secrets — never hard-coded
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Origins allowed to call edge functions.
// Set ALLOWED_ORIGINS as a comma-separated list in Supabase edge-function secrets.
// Falls back to the Lovable preview domain during development.
const RAW_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") ?? "";

/**
 * A Set of allowed CORS origins loaded from the ALLOWED_ORIGINS environment variable.
 * Using a Set gives O(1) lookup when checking if an origin is allowed.
 * If ALLOWED_ORIGINS is empty, all origins are allowed (open during development).
 */
const ALLOWED_ORIGINS: Set<string> = new Set(
  RAW_ORIGINS
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

/**
 * Build the CORS response headers for a given request origin.
 * Only reflects the origin back if it's in the allowed list (or the list is empty).
 * Returning "null" for disallowed origins makes the browser block the response.
 *
 * WHY CORS: browsers block cross-origin requests by default. Edge functions are
 * hosted on a different domain from the frontend app, so every response needs
 * these headers to allow the browser to read the response.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && (ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGINS.size === 0)
      ? origin
      : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // Vary: Origin tells CDNs to cache separately per origin
    "Vary": "Origin",
  };
}

/**
 * Respond to a CORS preflight OPTIONS request.
 * Browsers send a preflight request before any cross-origin POST with custom headers.
 * We must respond with 204 (No Content) and the correct CORS headers, otherwise
 * the browser will block the actual request.
 */
export function corsPreflightResponse(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("Origin")),
  });
}

/**
 * Return a JSON error response with CORS headers.
 *
 * @param message - Human-readable error description
 * @param status  - HTTP status code (e.g., 400, 401, 429, 500)
 * @param origin  - The request's Origin header value (for CORS)
 */
export function errorResponse(
  message: string,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

/**
 * Return a successful JSON response with CORS headers.
 *
 * @param data   - Any JSON-serialisable value to send as the response body
 * @param origin - The request's Origin header value (for CORS)
 */
export function successResponse(
  data: unknown,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

/**
 * AUTH: Verify the Bearer JWT in the request and return the authenticated user.
 * Throws an `AuthError` if the token is missing, malformed, or invalid.
 *
 * How it works:
 * 1. Reads the `Authorization: Bearer <token>` header.
 * 2. Creates a Supabase client with the token attached so the auth check
 *    runs in the context of that specific user.
 * 3. Calls `getUser(token)` which validates the JWT against Supabase Auth.
 * 4. Returns the user object if valid; throws AuthError otherwise.
 *
 * Callers should catch AuthError and return a 401 response.
 */
export async function requireAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or malformed Authorization header.");
  }

  // Strip "Bearer " prefix to get the raw JWT
  const token = authHeader.slice(7);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  // Validate the token with Supabase Auth — this also checks expiry
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError("Invalid or expired token.");
  }

  return data.user;
}

/**
 * A typed error class for authentication failures.
 * Edge function handlers use `instanceof AuthError` to distinguish auth errors
 * from other unexpected errors, so they can return 401 vs 500 appropriately.
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * A lightweight in-memory rate limiter for per-user request throttling.
 * Uses a sliding window approach: tracks how many requests a key (user ID)
 * has made in the current time window and rejects requests over the limit.
 *
 * NOTE: State is stored in memory within a single Deno worker instance.
 * It resets on cold starts and is NOT shared between multiple workers.
 * For strict rate limiting, use a persistent store instead.
 */
class RateLimiter {
  private counts = new Map<string, { n: number; resetAt: number }>();

  constructor(
    private readonly maxPerWindow: number, // max requests allowed per window
    private readonly windowMs: number,     // window size in milliseconds
  ) {}

  /**
   * Check if a key (e.g., user ID) is within the rate limit.
   * Returns true if the request is allowed, false if it should be rejected.
   * Automatically resets the counter when the time window expires.
   */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(key);
    if (!entry || now >= entry.resetAt) {
      // First request in a new window — initialise the counter
      this.counts.set(key, { n: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.n >= this.maxPerWindow) return false; // over the limit
    entry.n++;
    return true;
  }
}

// Shared rate limiter for AI endpoints: 20 calls per user per minute.
// This prevents a single user from exhausting the Gemini API quota.
export const aiRateLimiter = new RateLimiter(20, 60_000);
