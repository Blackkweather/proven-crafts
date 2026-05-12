import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Origins allowed to call edge functions.
// Set ALLOWED_ORIGINS as a comma-separated list in Supabase edge-function secrets.
// Falls back to the Lovable preview domain during development.
const RAW_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") ?? "";
const ALLOWED_ORIGINS: Set<string> = new Set(
  RAW_ORIGINS
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && (ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGINS.size === 0)
      ? origin
      : "null";
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
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

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

/** Verify the Bearer JWT and return the authenticated user, or throw. */
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

/** Lightweight per-instance rate limiter (resets when the worker restarts). */
class RateLimiter {
  private counts = new Map<string, { n: number; resetAt: number }>();

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(key);
    if (!entry || now >= entry.resetAt) {
      this.counts.set(key, { n: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.n >= this.maxPerWindow) return false;
    entry.n++;
    return true;
  }
}

// 20 AI calls per user per minute
export const aiRateLimiter = new RateLimiter(20, 60_000);
