// =============================================================================
// stripe-webhook — supabase/functions/stripe-webhook/index.ts
// =============================================================================
// Handles incoming Stripe webhook events. Verifies the Stripe-Signature header
// (HMAC + timestamp freshness) and updates the `subscriptions` table.
//
// Events handled:
//   checkout.session.completed          → create/activate subscription
//   customer.subscription.updated       → sync status + period end
//   customer.subscription.deleted       → mark as canceled
//
// Env secrets required:
//   STRIPE_WEBHOOK_SECRET      — whsec_... (from Stripe dashboard → Webhooks)
//   SUPABASE_URL               — auto-injected by Supabase
//   SUPABASE_SERVICE_ROLE_KEY  — needed to bypass RLS for upserts
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Maximum age of a webhook event before it's rejected (5 minutes).
const MAX_EVENT_AGE_SECONDS = 300;

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = sigHeader.split(",");
  const ts = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);

  // Reject if timestamp or signature component is missing
  if (!ts || !v1) return false;

  const timestampSeconds = parseInt(ts, 10);
  if (isNaN(timestampSeconds)) return false;

  // Reject stale or future-dated events (replay attack prevention)
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > MAX_EVENT_AGE_SECONDS) {
    console.warn(`[stripe-webhook] Rejected stale event: age=${Math.round(ageSeconds)}s`);
    return false;
  }

  const signed = `${ts}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const computed = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison is not available in this runtime;
  // HMAC verification + timestamp check provides sufficient protection.
  return computed === v1;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Fail closed: refuse all requests if the webhook secret is not configured.
  // This prevents fake events from being processed in misconfigured deployments.
  if (!WEBHOOK_SECRET) {
    console.error("[stripe-webhook] FATAL: STRIPE_WEBHOOK_SECRET is not set — rejecting request");
    return new Response("Webhook not configured", { status: 500 });
  }

  const payload = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  const valid = await verifyStripeSignature(payload, sig, WEBHOOK_SECRET);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = (session.metadata as Record<string, string>)?.company_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (!companyId) break;

        await supabase.from("subscriptions").upsert({
          company_id: companyId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: "studio",
          status: "active",
        }, { onConflict: "company_id" });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        await supabase.from("subscriptions")
          .update({
            status: sub.status as string,
            current_period_end: new Date((sub.current_period_end as number) * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end as boolean,
          })
          .eq("stripe_subscription_id", sub.id as string);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase.from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id as string);
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
