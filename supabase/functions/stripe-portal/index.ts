// =============================================================================
// stripe-portal — supabase/functions/stripe-portal/index.ts
// =============================================================================
// Creates a Stripe Customer Portal session for the authenticated company and
// returns the URL. The browser redirects there so the company can manage their
// subscription (cancel, update payment method, download invoices).
//
// Stripe Customer Portal must be enabled in the Stripe dashboard:
//   Dashboard → Settings → Billing → Customer portal
//
// Env secrets required:
//   STRIPE_SECRET_KEY  — sk_live_... or sk_test_...
//   APP_URL            — https://your-app.com  (return URL after portal)
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

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return corsPreflightResponse(req);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);

  let user;
  try {
    user = await requireAuth(req);
  } catch (e) {
    return errorResponse(e instanceof AuthError ? e.message : "Unauthorized", 401, origin);
  }

  if (!STRIPE_KEY) {
    return errorResponse("Payment not configured. Contact support.", 503, origin);
  }

  // Fetch the company's Stripe customer ID from our subscriptions table
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("company_id", user.id)
    .maybeSingle();

  if (subErr || !sub?.stripe_customer_id) {
    return errorResponse("No active subscription found.", 404, origin);
  }

  // Create a Stripe Customer Portal session
  const params = new URLSearchParams({
    customer: sub.stripe_customer_id,
    return_url: `${APP_URL}/company/billing`,
  });

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("[stripe-portal] Stripe error:", err);
    return errorResponse("Could not open billing portal. Try again.", 500, origin);
  }

  const session = await res.json();
  return successResponse({ url: session.url }, origin);
});
