// =============================================================================
// send-contact-notification — supabase/functions/send-contact-notification/index.ts
// =============================================================================
// Sends an email to the platform admin team when a new contact form submission
// arrives. Called after the submission is saved to contact_submissions.
//
// Called by: src/lib/db.ts → notifyContactSubmission()
// No authentication required (contact form is public).
//
// Request body:
//   { name, email, company?, topic, message }
//
// Env secrets required:
//   RESEND_API_KEY  — for email delivery (optional; skipped if unset)
//   FROM_EMAIL      — sender address
//   ADMIN_EMAIL     — destination for contact form alerts
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsPreflightResponse,
  errorResponse,
  successResponse,
} from "../_shared/auth.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "notifications@skillnetwork.io";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "team@skillnetwork.io";

/** Escape HTML special characters to prevent XSS in email clients. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return corsPreflightResponse(req);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    !("email" in body) ||
    !("topic" in body) ||
    !("message" in body)
  ) {
    return errorResponse("Missing required fields: name, email, topic, message", 400, origin);
  }

  const { name, email, company, topic, message } = body as {
    name: string;
    email: string;
    company?: string;
    topic: string;
    message: string;
  };

  // Basic email format validation
  if (typeof email !== "string" || !email.includes("@")) {
    return errorResponse("Invalid email address", 400, origin);
  }

  if (!RESEND_KEY) {
    console.log("[send-contact-notification] SKIP email (no RESEND_API_KEY)");
    return successResponse({ sent: false, reason: "RESEND_API_KEY not configured" }, origin);
  }

  const safeName    = escapeHtml(String(name).slice(0, 200));
  const safeEmail   = escapeHtml(String(email).slice(0, 200));
  const safeCompany = company ? escapeHtml(String(company).slice(0, 200)) : "—";
  const safeTopic   = escapeHtml(String(topic).slice(0, 200));
  const safeMessage = escapeHtml(String(message).slice(0, 5000));

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
      <div style="font-size:20px;font-weight:600;margin-bottom:16px">
        New contact form submission
      </div>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600;width:120px">Name</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${safeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600">Email</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${safeEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600">Company</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${safeCompany}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f5f5f5;font-weight:600">Topic</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${safeTopic}</td>
        </tr>
      </table>
      <div style="background:#f9f9f9;padding:16px;border-radius:6px;white-space:pre-wrap">${safeMessage}</div>
      <p style="margin-top:24px;font-size:12px;color:#999">
        Skill Network · Contact form submission
      </p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        reply_to: String(email).slice(0, 200),
        subject: `[Skill Network] Contact: ${String(topic).slice(0, 100)}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[send-contact-notification] Resend error:", err);
      return errorResponse("Email send failed", 500, origin);
    }

    return successResponse({ sent: true }, origin);
  } catch (err) {
    console.error("[send-contact-notification] unexpected error:", err);
    return errorResponse("Internal error", 500, origin);
  }
});
