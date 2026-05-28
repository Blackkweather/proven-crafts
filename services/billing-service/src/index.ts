// =============================================================================
// index.ts — services/billing-service/src/index.ts
// =============================================================================
// Billing Service — manages subscriptions and Stripe checkout/portal sessions.
//
// Endpoints:
//   GET  /billing/subscription        — get current subscription for a company
//   POST /billing/checkout            — create a Stripe checkout session URL
//   POST /billing/portal              — create a Stripe customer portal URL
//   GET  /health
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3006");

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

function accountType(req: { headers: Record<string, unknown> }) {
  return req.headers["x-account-type"] as string | undefined;
}

app.get("/health", async () => ({ status: "ok", service: "billing-service" }));

// ── Get subscription ──────────────────────────────────────────────────────────

/**
 * Fetch the current subscription record for the authenticated company.
 * AUTH: requires x-account-type = "company"
 * DATABASE: reads `subscriptions` by company_id
 */
app.get("/billing/subscription", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Company accounts only" });

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", uid)
    .single();
  if (!company) return reply.code(404).send({ error: "Company not found" });

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", company.id)
    .single();

  if (error) return reply.send({ subscription: null });
  return reply.send({ subscription: data });
});

// ── Create checkout session ───────────────────────────────────────────────────

const CheckoutBody = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

/**
 * Create a Stripe checkout session for upgrading/subscribing.
 * Returns a checkout URL the frontend redirects to.
 * AUTH: requires x-account-type = "company"
 * DATABASE: reads `companies` for stripe_customer_id
 */
app.post("/billing/checkout", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Company accounts only" });

  const body = CheckoutBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data: company } = await supabase
    .from("companies")
    .select("id, stripe_customer_id")
    .eq("owner_id", uid)
    .single();
  if (!company) return reply.code(404).send({ error: "Company not found" });

  // Invoke the Supabase Edge Function which holds the Stripe secret key
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: {
      priceId: body.data.priceId,
      customerId: company.stripe_customer_id,
      companyId: company.id,
      successUrl: body.data.successUrl,
      cancelUrl: body.data.cancelUrl,
    },
  });

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send(data);
});

// ── Create portal session ─────────────────────────────────────────────────────

const PortalBody = z.object({
  returnUrl: z.string().url(),
});

/**
 * Create a Stripe customer portal session for managing an existing subscription.
 * AUTH: requires x-account-type = "company"
 * DATABASE: reads `companies` for stripe_customer_id
 */
app.post("/billing/portal", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid || accountType(request as any) !== "company")
    return reply.code(403).send({ error: "Company accounts only" });

  const body = PortalBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data: company } = await supabase
    .from("companies")
    .select("stripe_customer_id")
    .eq("owner_id", uid)
    .single();
  if (!company?.stripe_customer_id)
    return reply.code(404).send({ error: "No Stripe customer found" });

  const { data, error } = await supabase.functions.invoke("stripe-portal", {
    body: { customerId: company.stripe_customer_id, returnUrl: body.data.returnUrl },
  });

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send(data);
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Billing Service running on port ${PORT}`);
});
