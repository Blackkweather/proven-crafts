import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Skill Network" },
      { name: "description", content: "Transparent pricing for talent and companies." },
      { property: "og:title", content: "Pricing — Skill Network" },
      { property: "og:description", content: "Free for talent. Companies pay for outcomes, not seats." },
    ],
  }),
  component: PricingPage,
});

const COMPANY_PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: "€149",
    period: "per role / month",
    tagline: "For teams making their first skill-based hire.",
    features: ["1 live role", "1 challenge per role", "Match-score ranking", "Candidate inbox"],
    cta: "Get started",
    highlight: false,
  },
  {
    key: "studio",
    name: "Studio",
    price: "€490",
    period: "per active role / month",
    tagline: "For lean teams hiring 1–4 roles at once.",
    features: ["Up to 4 live roles", "2 challenges per role", "Match-score ranking & filters", "Built-in candidate inbox", "Pipeline stage management"],
    cta: "Start hiring",
    highlight: true,
    badge: "Most popular",
  },
  {
    key: "scale",
    name: "Scale",
    price: "€990",
    period: "per month",
    tagline: "For scale-ups running continuous hiring.",
    features: ["Unlimited live roles", "Unlimited challenges", "Priority candidate matching", "ATS integrations", "Dedicated account manager"],
    cta: "Start scaling",
    highlight: false,
  },
] as const;

const TALENT_PLANS = [
  {
    key: "free",
    name: "Free",
    price: "€0",
    period: "forever",
    tagline: "Build your portfolio and get discovered.",
    features: ["Unlimited project submissions", "Apply to any role", "Match-score insights", "Direct inbox with hiring teams"],
    cta: "Create your profile",
    highlight: false,
    href: "/signup",
  },
  {
    key: "talent_pro",
    name: "Pro",
    price: "€19",
    period: "per month",
    tagline: "Stand out and get matched faster.",
    features: ["Everything in Free", "Priority matching visibility", "Profile boost in search", "Early access to challenges", "Application read receipts"],
    cta: "Go Pro",
    highlight: true,
    badge: "Best value",
  },
  {
    key: "talent_elite",
    name: "Elite",
    price: "€49",
    period: "per month",
    tagline: "For serious candidates chasing top roles.",
    features: ["Everything in Pro", "Featured profile placement", "Exclusive elite challenges", "1-on-1 career coaching session", "Verified skills badge"],
    cta: "Go Elite",
    highlight: false,
  },
] as const;

function PricingPage() {
  const { user, session } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: string) {
    setError(null);
    if (!user || !session) {
      window.location.href = `/signup?next=pricing`;
      return;
    }
    setLoadingPlan(plan);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("stripe-checkout", {
        body: { plan },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <section className="container mx-auto px-6 pb-24 pt-20 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </div>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">
            Pay for outcomes.
            <br />
            <span className="italic text-muted-foreground">Never for seats.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Talent uses Skill Network for free, forever. Companies pay only when a role is live and hiring.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive text-center">
            {error}
          </div>
        )}

        {/* Company Plans */}
        <div className="mx-auto mt-16 max-w-6xl">
          <h2 className="mb-8 text-center font-display text-2xl text-muted-foreground">For companies</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {COMPANY_PLANS.map((plan) => (
              <article
                key={plan.key}
                className={plan.highlight
                  ? "rounded-2xl border-2 border-primary bg-card p-8 shadow-elevated"
                  : "surface-paper rounded-2xl p-8"}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl">{plan.name}</h3>
                  {"badge" in plan && (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-8 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout(plan.key)}
                  disabled={loadingPlan === plan.key}
                  className={`mt-10 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border bg-background hover:bg-accent"
                  }`}
                >
                  {loadingPlan === plan.key ? "Redirecting…" : plan.cta}
                </button>
                {plan.highlight && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Secure checkout via Stripe · Cancel anytime
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>

        {/* Talent Plans */}
        <div className="mx-auto mt-20 max-w-6xl">
          <h2 className="mb-8 text-center font-display text-2xl text-muted-foreground">For talent</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {TALENT_PLANS.map((plan) => (
              <article
                key={plan.key}
                className={plan.highlight
                  ? "rounded-2xl border-2 border-primary bg-card p-8 shadow-elevated"
                  : "surface-paper rounded-2xl p-8"}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl">{plan.name}</h3>
                  {"badge" in plan && (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-5xl">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-8 space-y-3 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-foreground/85">{f}</span>
                    </li>
                  ))}
                </ul>
                {"href" in plan ? (
                  <Link
                    to={plan.href}
                    className="mt-10 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => startCheckout(plan.key)}
                    disabled={loadingPlan === plan.key}
                    className={`mt-10 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
                      plan.highlight
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {loadingPlan === plan.key ? "Redirecting…" : plan.cta}
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>

        {/* One-off challenge */}
        <div className="mx-auto mt-20 max-w-3xl rounded-2xl border border-border bg-paper p-8 text-center">
          <h3 className="font-display text-2xl">Hiring once, not continuously?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Run a single skill challenge for a flat €1,200 — we'll handle judging support and shortlisting.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-flex rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Brief us on your role →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
