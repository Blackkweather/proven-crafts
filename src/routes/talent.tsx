// =============================================================================
// TALENT MARKETING PAGE — src/routes/talent.tsx
// =============================================================================
// Static marketing page aimed at job seekers (talent). Explains the platform's
// value proposition for people looking to be hired: build a profile around
// real work, take challenges, get matched without submitting a resume.
// There is no data fetching on this page — it is fully static content.
// Sets Open Graph and meta tags for SEO.
//
// KEYWORDS: NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

// NAVIGATION: Route definition with SEO meta tags.
export const Route = createFileRoute("/talent")({
  // Sets the browser tab title and meta description for search engines / social sharing.
  head: () => ({
    meta: [
      { title: "For Talent — Skill Network" },
      {
        name: "description",
        content:
          "Build a profile around real work, take focused challenges, and get hired on signal.",
      },
    ],
  }),
  component: TalentMarketing,
});

function TalentMarketing() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero section — headline and dual CTAs */}
      <section className="container mx-auto px-6 pt-20 pb-12 lg:pt-28">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          For talent
        </div>
        <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight md:text-6xl">
          Your work is the resume.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Build a profile around what you've shipped. Take challenges that companies actually pay
          attention to. Skip the algorithmic black box.
        </p>
        <div className="mt-8 flex gap-3">
          {/* NAVIGATION: Primary CTA — directs talent to sign up */}
          <Link
            to="/signup"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create your profile
          </Link>
          {/* NAVIGATION: Secondary CTA — for existing users to log in */}
          <Link
            to="/login"
            className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
          >
            I have an account
          </Link>
        </div>
      </section>

      {/* Feature grid — 6 platform benefits for talent, displayed in a 3-column grid */}
      <section className="container mx-auto grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3 mx-6 max-w-[calc(100%-3rem)]">
        {[
          {
            t: "Show, don't tell",
            b: "Pin projects, writing, videos, and challenge submissions. We render them like a magazine, not a list.",
          },
          {
            t: "Skill levels that mean something",
            b: "Foundational → Expert. Backed by evidence — links, repos, outcomes.",
          },
          {
            t: "Challenges, not gauntlets",
            b: "Most challenges take a weekend. Many are paid. All are evaluated by humans.",
          },
          {
            t: "Match scores you can read",
            b: "See exactly which skills line up and which don't. No mystery rankings.",
          },
          { t: "Quiet by default", b: "You control who sees what. No public job-search shame." },
          {
            t: "Direct conversations",
            b: "When a company reaches out, you're talking to the team — not a recruiter chain.",
          },
        ].map((x) => (
          // Each feature is a card in the grid.
          <div key={x.t} className="bg-background p-7">
            <div className="font-display text-xl">{x.t}</div>
            <p className="mt-2 text-sm text-muted-foreground">{x.b}</p>
          </div>
        ))}
      </section>

      {/* Closing CTA section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-4xl">Ready when you are.</h2>
        {/* NAVIGATION: Final CTA to sign up */}
        <Link
          to="/signup"
          className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Start your profile
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
