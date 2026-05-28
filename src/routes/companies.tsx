// =============================================================================
// COMPANIES MARKETING PAGE — src/routes/companies.tsx
// =============================================================================
// Static marketing page aimed at hiring companies. Explains the platform's
// value proposition for employers: post focused skill challenges, review real
// submissions, and hire faster using transparent match scores. No data fetching
// occurs on this page — all content is hardcoded.
// Sets Open Graph and meta tags for SEO.
//
// KEYWORDS: NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { usePlatformStats } from "@/lib/hooks";

// NAVIGATION: Route definition with SEO meta tags.
export const Route = createFileRoute("/companies")({
  // Sets browser title and description for search engines / social sharing.
  head: () => ({
    meta: [
      { title: "For Companies — Skill Network" },
      {
        name: "description",
        content:
          "Run skill-based challenges, evaluate real output, hire faster with transparent match scores.",
      },
    ],
  }),
  component: CompaniesMarketing,
});

function CompaniesMarketing() {
  const { stats } = usePlatformStats();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero section — headline, sub-copy, CTAs, and an illustrative "control panel" card */}
      <section className="container mx-auto grid gap-12 px-6 pt-20 pb-16 lg:grid-cols-12 lg:pt-28">
        <div className="lg:col-span-7">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            For companies
          </div>
          <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">
            Hire on output. Not on optics.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Post a challenge in the morning. By evening, you're reading focused submissions from
            people whose skills actually map to the role.
          </p>
          <div className="mt-8 flex gap-3">
            {/* NAVIGATION: Primary CTA — take companies to the sign-up flow */}
            <Link
              to="/signup"
              className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Set up hiring
            </Link>
            {/* NAVIGATION: Secondary CTA — existing company accounts log in here */}
            <Link
              to="/login"
              className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Platform stats card — live data from the database */}
        <div className="lg:col-span-5">
          <div className="surface-paper rounded-2xl p-6 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Platform at a glance
            </div>
            <ul className="mt-4 divide-y divide-border">
              {[
                ["Verified talent", stats ? stats.talentCount.toLocaleString() : "…"],
                ["Active jobs", stats ? String(stats.openJobsCount) : "…"],
                ["Active challenges", stats ? String(stats.openChallengesCount) : "…"],
                ["Companies hiring", stats ? String(stats.companyCount) : "…"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-display text-lg">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3-step how-it-works section for companies */}
      <section className="container mx-auto grid gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          {
            n: "01",
            t: "Post a focused challenge",
            b: "Define the skill, the brief, the deadline. Optional prize. We do the distribution.",
          },
          {
            n: "02",
            t: "Review real output",
            b: "Submissions, not bullet points. Ranked by transparent match score and reviewer notes.",
          },
          {
            n: "03",
            t: "Move to interview fast",
            b: "Built-in messaging, structured shortlists, no resume parsing pipeline.",
          },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-border p-7">
            <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
            <div className="mt-3 font-display text-xl">{s.t}</div>
            <p className="mt-2 text-sm text-muted-foreground">{s.b}</p>
          </div>
        ))}
      </section>

      <SiteFooter />
    </div>
  );
}
