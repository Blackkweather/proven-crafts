// =============================================================================
// send-match-invite — supabase/functions/send-match-invite/index.ts
// =============================================================================
// Creates an in-app notification and sends an email when a company invites
// a talent to connect (match invite).
//
// Called by: src/lib/db.ts → notifyMatchInvite()
//
// Request body: { talent_id: string, company_name: string }
//
// Env secrets required:
//   SUPABASE_URL               — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY  — needed to insert notifications + look up email
//   RESEND_API_KEY             — for email delivery (optional; skipped if unset)
//   FROM_EMAIL                 — sender address (default: notifications@skillnetwork.io)
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  AuthError,
  corsPreflightResponse,
  errorResponse,
  requireAuth,
  successResponse,
} from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "notifications@skillnetwork.io";
const APP_URL = Deno.env.get("APP_URL") ?? "https://tanstack-start-app.skillnetwork.workers.dev";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return corsPreflightResponse(req);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);

  // Caller must be authenticated (the company user initiating the match)
  let caller;
  try {
    caller = await requireAuth(req);
  } catch (e) {
    return errorResponse(e instanceof AuthError ? e.message : "Unauthorized", 401, origin);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("talent_id" in body) ||
    !("company_name" in body)
  ) {
    return errorResponse("Missing required fields: talent_id, company_name", 400, origin);
  }

  const { talent_id, company_name } = body as { talent_id: string; company_name: string };

  if (typeof talent_id !== "string" || !/^[0-9a-f-]{36}$/i.test(talent_id)) {
    return errorResponse("Invalid talent_id", 400, origin);
  }
  if (typeof company_name !== "string" || company_name.trim().length === 0) {
    return errorResponse("Invalid company_name", 400, origin);
  }

  const safeName = company_name.slice(0, 100).trim();

  try {
    // 1. Insert in-app notification using service role (bypasses RLS)
    const { error: notifErr } = await supabaseAdmin.from("notifications").insert({
      user_id: talent_id,
      kind: "match",
      title: `${safeName} wants to connect`,
      body: `You have a new match invite from ${safeName}. Review and respond in your dashboard.`,
      link: `${APP_URL}/app/matches`,
    });

    if (notifErr) {
      console.error("[send-match-invite] notification insert failed:", notifErr.message);
      // Non-fatal — continue to attempt email
    }

    // 2. Look up talent's email from auth.users (service role required)
    const { data: authUser, error: userErr } = await supabaseAdmin.auth.admin.getUserById(talent_id);
    if (userErr || !authUser?.user?.email) {
      console.warn("[send-match-invite] could not fetch talent email:", userErr?.message);
      return successResponse({ notified: true, emailed: false }, origin);
    }

    const talentEmail = authUser.user.email;

    // 3. Send email via Resend (best-effort — failure is non-fatal)
    if (!RESEND_KEY) {
      console.log("[send-match-invite] SKIP email (no RESEND_API_KEY)");
      return successResponse({ notified: true, emailed: false }, origin);
    }

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <div style="font-size:20px;font-weight:600;margin-bottom:8px">New match invite 🤝</div>
        <p style="color:#666;margin:0 0 20px">
          <strong>${safeName}</strong> wants to connect with you on Skill Network.
          Review their profile and respond to the invite in your dashboard.
        </p>
        <a href="${APP_URL}/app/matches"
           style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">
          View invite →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#999">
          Skill Network ·
          <a href="${APP_URL}/app/settings" style="color:#999">Manage notifications</a>
        </p>
      </div>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: talentEmail,
        subject: `${safeName} wants to connect with you`,
        html,
      }),
    });

    if (!emailRes.ok) {
      console.error("[send-match-invite] Resend error:", await emailRes.text());
      return successResponse({ notified: true, emailed: false }, origin);
    }

    return successResponse({ notified: true, emailed: true }, origin);
  } catch (err) {
    console.error("[send-match-invite] unexpected error:", err);
    return errorResponse("Internal error", 500, origin);
  }
});
