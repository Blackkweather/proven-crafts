// =============================================================================
// stripe-checkout — supabase/functions/stripe-checkout/index.ts
// =============================================================================
// Creates a Stripe Checkout Session for the Studio plan and returns the
// hosted checkout URL. The browser is then redirected to Stripe.
//
// Request: POST body { plan: 'studio' }
// Response: { url: string } — the Stripe hosted checkout URL
//
// Env secrets required (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
//   STRIPE_STUDIO_PRICE_ID   — price_... (your Stripe price ID for the Studio plan)
//   APP_URL                  — https://your-app.workers.dev
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AuthError,
  corsPreflightResponse,
  errorResponse,
  requireAuth,
  successResponse,
} from "../_shared/auth.ts";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STUDIO_PRICE = Deno.env.get("STRIPE_STUDIO_PRICE_ID") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://tanstack-start-app.skillnetwork.workers.dev";

if (!STRIPE_KEY) console.error("[stripe-checkout] STRIPE_SECRET_KEY is not set");
if (!STUDIO_PRICE) console.error("[stripe-checkout] STRIPE_STUDIO_PRICE_ID is not set");

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

  if (!STRIPE_KEY || !STUDIO_PRICE) {
    return errorResponse("Payment not configured. Contact support.", 503, origin);
  }

  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": STUDIO_PRICE,
    "line_items[0][quantity]": "1",
    success_url: `${APP_URL}/company/billing?success=true`,
    cancel_url: `${APP_URL}/pricing`,
    "metadata[company_id]": user.id,
    "metadata[user_email]": user.email ?? "",
    customer_email: user.email ?? "",
    allow_promotion_codes: "true",
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("[stripe-checkout] Stripe error:", err);
    return errorResponse("Could not create checkout session. Try again.", 500, origin);
  }

  const session = await res.json();
  return successResponse({ url: session.url }, origin);
});
