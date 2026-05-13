// =============================================================================
// PRICING PAGE — src/routes/pricing.tsx
// =============================================================================
// Static page listing the three pricing tiers for Skill Network. No data
// fetching occurs here — all content is defined in the `tiers` array at the
// top of the file. Sets Open Graph and meta tags for SEO.
//
// Tiers:
//   1. Talent — Free forever (for job seekers)
//   2. Studio — €490/role/month, "Most popular" (for small teams hiring 1–4 roles)
//   3. Network — Custom annual pricing (for scale-ups and enterprise)
//
// At the bottom there is a secondary "one-off challenge" offer that links to
// the contact page.
//
// KEYWORDS: NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

// NAVIGATION: Route definition with SEO meta tags.
export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Skill Network" },
      {
        name: "description",
        content:
          "Transparent pricing for talent and companies. Free for talent, pay for outcomes if you hire.",
      },
      { property: "og:title", content: "Pricing — Skill Network" },
      {
        property: "og:description",
        content: "Free for talent. Companies pay for outcomes, not seats.",
      },
    ],
  }),
  component: PricingPage,
});

// The pricing tier definitions. Each tier has a name, price, cadence string,
// tagline, list of features, a CTA (label + destination route), and a visual tone.
// "featured: true" marks the Studio tier with a highlighted border + "Most popular" badge.
const tiers = [
  {
    name: "Talent",
    price: "Free",
    cadence: "forever",
    tagline: "Build your portfolio. Take challenges. Get matched.",
    features: [
      "Unlimited projects, writing, and submissions",
      "Apply to any role on the network",
      "Match-score insights on every job",
      "Direct inbox with hiring teams",
    ],
    cta: { label: "Create your profile", to: "/signup" as const },
    tone: "paper" as const,
  },
  {
    name: "Studio",
    price: "€490",
    cadence: "per active role / month",
    tagline: "For lean teams hiring 1–4 roles. Skill-first from day one.",
    features: [
      "Unlimited candidate review",
      "Up to 2 live challenges",
      "Match-score ranking & filters",
      "Built-in candidate inbox",
    ],
    cta: { label: "Start hiring", to: "/signup" as const },
    tone: "primary" as const,
    featured: true, // Highlighted with a thicker border and "Most popular" badge
  },
  {
    name: "Network",
    price: "Custom",
    cadence: "annual",
    tagline: "For scale-ups and enterprise teams running continuous hiring.",
    features: [
      "Unlimited roles & challenges",
      "Talent partner concierge",
      "ATS integrations & SSO",
      "Editorial featured placements",
    ],
    cta: { label: "Talk to sales", to: "/contact" as const },
    tone: "dark" as const, // Dark background/inverted colour scheme
  },
];

function PricingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <section className="container mx-auto px-6 pb-16 pt-20 lg:pt-28">
        {/* Page headline */}
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
            Talent uses Skill Network for free, forever. Companies pay only when a role is live and
            hiring.
          </p>
        </div>

        {/* Tier cards grid */}
        <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={
                // Each tier has a different visual style based on `tone`:
                // dark = inverted (foreground bg, background text)
                // featured = highlighted with primary border + shadow
                // default = soft paper surface
                t.tone === "dark"
                  ? "rounded-2xl border border-border bg-foreground p-8 text-background"
                  : t.featured
                    ? "rounded-2xl border-2 border-primary bg-card p-8 shadow-elevated"
                    : "surface-paper rounded-2xl p-8"
              }
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl">{t.name}</h2>
                {/* "Most popular" badge — only shown on the featured tier */}
                {t.featured && (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
                    Most popular
                  </span>
                )}
              </div>
              {/* Price + cadence */}
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-display text-5xl">{t.price}</span>
                <span
                  className={
                    t.tone === "dark"
                      ? "text-sm text-background/60"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {t.cadence}
                </span>
              </div>
              <p
                className={
                  "mt-3 text-sm " +
                  (t.tone === "dark" ? "text-background/70" : "text-muted-foreground")
                }
              >
                {t.tagline}
              </p>
              {/* Feature list */}
              <ul className="mt-8 space-y-3 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    {/* Bullet dot — colour adapts to tone */}
                    <span
                      className={
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " +
                        (t.tone === "dark" ? "bg-background/60" : "bg-primary")
                      }
                    />
                    <span
                      className={t.tone === "dark" ? "text-background/85" : "text-foreground/85"}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              {/* NAVIGATION: CTA button links to signup or contact */}
              <Link
                to={t.cta.to}
                className={
                  "mt-10 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-sm font-medium transition-colors " +
                  (t.tone === "dark"
                    ? "bg-background text-foreground hover:bg-background/90"
                    : t.featured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border bg-background hover:bg-accent")
                }
              >
                {t.cta.label}
              </Link>
            </article>
          ))}
        </div>

        {/* One-off challenge offer — for companies hiring once, not continuously */}
        <div className="mx-auto mt-20 max-w-3xl rounded-2xl border border-border bg-paper p-8 text-center">
          <h3 className="font-display text-2xl">Hiring once, not continuously?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Run a single skill challenge for a flat €1,200 — we'll handle judging support and
            shortlisting.
          </p>
          {/* NAVIGATION: Links to the contact page */}
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
