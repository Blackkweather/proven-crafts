// =============================================================================
// COMPANY BILLING — src/routes/company.billing.tsx
// =============================================================================
// Shows the current subscription status, plan details, and lets the company
// manage their subscription via a Stripe Customer Portal link.
// =============================================================================

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, CreditCard, XCircle, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/company/billing")({
  validateSearch: (s: Record<string, unknown>) => ({
    success: s.success === "true" || s.success === true,
  }),
  component: BillingPage,
});

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
}

function BillingPage() {
  const { user, session } = useAuth();
  const { success } = useSearch({ from: "/company/billing" });

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id")
      .eq("company_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSub(data as Subscription | null);
        setLoading(false);
      });
  }, [user?.id]);

  async function openPortal() {
    setError(null);
    if (!session) return;
    setPortalLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("stripe-portal", {});
      if (fnErr) throw new Error(fnErr.message);
      if (data?.url) window.location.href = data.url;
      else throw new Error("No portal URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPortalLoading(false);
    }
  }

  async function startCheckout() {
    setError(null);
    if (!session) return;
    setCheckoutLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("stripe-checkout", {
        body: { plan: "studio" },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCheckoutLoading(false);
    }
  }

  const isActive = sub?.status === "active" || sub?.status === "trialing";
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your Skill Network subscription.</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
          <CheckCircle2 size={20} className="shrink-0 text-primary" />
          <div>
            <div className="font-medium text-sm">Payment successful</div>
            <div className="text-xs text-muted-foreground mt-0.5">Your Studio plan is now active. Start posting roles from the dashboard.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4">
          <XCircle size={20} className="shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="surface-paper rounded-2xl p-8 text-center text-sm text-muted-foreground animate-pulse">
          Loading subscription…
        </div>
      ) : isActive ? (
        // Active subscription card
        <div className="surface-paper rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current plan</div>
              <div className="mt-1 font-display text-2xl capitalize">{sub?.plan ?? "Studio"}</div>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              sub?.status === "active" ? "bg-primary/10 text-primary" :
              sub?.status === "trialing" ? "bg-primary/10 text-primary" :
              "bg-muted text-muted-foreground"
            }`}>
              {sub?.status}
            </span>
          </div>

          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm">
            <Row label="Plan" value="Studio — €490 / active role / month" />
            {periodEnd && (
              <Row
                label={sub?.cancel_at_period_end ? "Cancels on" : "Renews on"}
                value={periodEnd}
                icon={<Clock size={13} className="text-muted-foreground" />}
              />
            )}
          </div>

          {sub?.cancel_at_period_end && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Your subscription will not renew after {periodEnd}. All your data is preserved.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60 transition-colors"
            >
              <CreditCard size={15} />
              {portalLoading ? "Opening portal…" : "Manage subscription"}
              {!portalLoading && <ExternalLink size={12} className="text-muted-foreground" />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Need help with your invoice or billing?{" "}
            <Link to="/contact" className="underline-offset-4 hover:underline">Contact us</Link>
          </p>
        </div>
      ) : (
        // No active subscription
        <div className="space-y-6">
          <div className="surface-paper rounded-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current plan</div>
            <div className="mt-2 font-display text-2xl text-muted-foreground">Free</div>
            <p className="mt-3 text-sm text-muted-foreground">
              You're on the free tier. Upgrade to Studio to post roles and run challenges at scale.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-primary bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-display text-xl">Studio plan</div>
                <div className="mt-1 font-display text-3xl">€490 <span className="text-base font-sans font-normal text-muted-foreground">/ active role / month</span></div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {["Unlimited candidate review", "Up to 2 live challenges", "AI match-score ranking", "Built-in candidate inbox"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="mt-6 w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {checkoutLoading ? "Redirecting to checkout…" : "Upgrade to Studio →"}
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Secure checkout via Stripe · Cancel anytime</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-right">
        {icon}
        {value}
      </span>
    </div>
  );
}
