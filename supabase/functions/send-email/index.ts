// =============================================================================
// send-email — supabase/functions/send-email/index.ts
// =============================================================================
// Sends transactional emails via the Resend API.
// Called by the frontend when a notification should also go to email.
//
// Request body: { to: string, subject: string, html: string }
//
// Env secrets required:
//   RESEND_API_KEY   — re_... (get from resend.com — free: 100 emails/day)
//   FROM_EMAIL       — noreply@yourdomain.com (must be verified in Resend)
//
// Gracefully degrades: if RESEND_API_KEY is not set, returns { sent: false }
// without error so callers don't crash.
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsPreflightResponse, errorResponse, successResponse } from "../_shared/auth.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "notifications@skillnetwork.io";

if (!RESEND_KEY) console.warn("[send-email] RESEND_API_KEY not set — emails will be skipped");

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return corsPreflightResponse(req);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);

  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400, origin);
  }

  const { to, subject, html } = body;
  if (!to || !subject || !html) {
    return errorResponse("Missing required fields: to, subject, html", 400, origin);
  }

  if (!RESEND_KEY) {
    console.log(`[send-email] SKIP (no key) → ${to}: ${subject}`);
    return successResponse({ sent: false, reason: "RESEND_API_KEY not configured" }, origin);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[send-email] Resend error:", err);
    return errorResponse("Email send failed", 500, origin);
  }

  return successResponse({ sent: true }, origin);
});
