// =============================================================================
// MANIFESTO PAGE — src/routes/manifesto.tsx
// =============================================================================
// Long-form editorial article explaining the philosophy behind Skill Network.
// Why was the platform built? What's wrong with the current hiring system?
// What does the team believe? This is fully static content — no data fetching,
// no user-specific rendering. It reads like a published essay.
//
// Structure:
//   - Headline + intro paragraph
//   - Section 1: The problem (resumes are bad signals)
//   - Pull quote
//   - Section 2: What we actually believe (3 principles: 01, 02, 03)
//   - Dark contrast band (mission statement)
//   - Section 3: Who this is for
//   - Stats interlude (3 data points)
//   - Section 4: What we're building toward
//   - Letter-style closing with CTAs
//
// KEYWORDS: NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

// NAVIGATION: Route definition with SEO meta tags.
export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — Skill Network" },
      {
        name: "description",
        content: "Why we built a hiring platform around proven skills instead of resumes.",
      },
    ],
  }),
  component: Manifesto,
});

function Manifesto() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto max-w-3xl px-6 pb-32 pt-20">
        {/* Kicker — small label at the top */}
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Manifesto · 2026
        </div>

        {/* Main headline */}
        <h1 className="mt-4 font-display text-5xl leading-[1.08] md:text-6xl lg:text-7xl">
          The resume is
          <br />a bad product.
        </h1>

        {/* Introduction paragraph */}
        <p className="mt-8 text-xl leading-relaxed text-muted-foreground max-w-2xl">
          We built Skill Network because we've been on both sides of a broken system — and we got
          tired of it.
        </p>

        {/* Section 1: The problem with the current hiring signal */}
        <section className="mt-16 space-y-6 text-lg leading-relaxed text-foreground/85">
          <h2 className="font-display text-3xl text-foreground">
            The problem isn't effort. It's the signal.
          </h2>
          <p>
            Hiring is broken in a very specific way. It doesn't fail because people aren't trying
            hard enough. It fails because the primary artifact — the resume — is a document designed
            to obscure as much as it reveals.
          </p>
          <p>
            It compresses years of complicated, context-dependent work into bullet points scraped
            for keywords by a machine that was never meant to understand nuance. Then it hands those
            bullets to a hiring manager who has twelve minutes and forty-seven other candidates.
          </p>
          <p>
            The result: people who are genuinely excellent get filtered out, and people who are
            excellent <em>at writing resumes</em> get in. Those are different skills.
          </p>
        </section>

        {/* Pull quote — blockquote styled with a left border */}
        <blockquote className="my-16 border-l-2 border-foreground pl-8">
          <p className="font-display text-2xl leading-snug text-foreground md:text-3xl">
            "Work is a better signal than a document about work. This is obvious. And yet."
          </p>
        </blockquote>

        {/* Section 2: Core beliefs — three numbered principles */}
        <section className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <h2 className="font-display text-3xl text-foreground">What we actually believe.</h2>
          <p>We started from three small, unfashionable ideas:</p>

          <div className="my-8 space-y-6">
            {[
              {
                n: "01",
                title: "Show the work, not the words about the work.",
                body: "A challenge — scoped, concrete, real — tells you more in four hours than a five-round interview loop. We built infrastructure for companies to run challenges properly: briefed, evaluated, and compensated where possible. The output is a ranked, verifiable signal. Not a vibe.",
              },
              {
                n: "02",
                title: "Match scores should be readable.",
                body: "Algorithms that rank people in secret are not neutral. They launder bias with math. Every match score on Skill Network is built from explicit skill comparisons that both sides can inspect. You know why you ranked 94%. The company knows why they should hire you.",
              },
              {
                n: "03",
                title: "Ghosting is a product failure, not a social one.",
                body: "Companies ghost candidates because there's no cost to it. We built accountability into the product: response time averages, ghosting rates, and trust scores are public. Companies that treat candidates poorly get a lower trust score. That score is visible to every candidate on the platform.",
              },
            ].map((item) => (
              <div key={item.n} className="grid gap-4 sm:grid-cols-[3rem_1fr]">
                <div className="font-mono text-sm text-muted-foreground pt-1">{item.n}</div>
                <div>
                  <h3 className="font-display text-xl text-foreground">{item.title}</h3>
                  <p className="mt-2 text-base text-foreground/75 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dark contrast mission statement band */}
        <div className="my-16 rounded-2xl bg-foreground p-10 text-background">
          <h2 className="font-display text-3xl leading-snug">
            We are not trying to make hiring faster.
            <br />
            We are trying to make it righter.
          </h2>
          <p className="mt-4 text-base text-background/75 max-w-xl leading-relaxed">
            Speed optimizes for throughput. We optimize for fit. A slower process that ends with the
            right person is worth more to every company, every candidate, and everyone those
            decisions affect downstream.
          </p>
        </div>

        {/* Section 3: Who this is for */}
        <section className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <h2 className="font-display text-3xl text-foreground">Who this is for.</h2>
          <p>
            Skill Network is for people who have outgrown the resume. Who have shipped real things,
            learned hard lessons, and can't fit any of it into a PDF. Who've been filtered out by
            systems that couldn't see what they were looking at.
          </p>
          <p>
            It's for companies that understand the cost of a bad hire — not just in money, but in
            team trust, product direction, and the months it takes to undo the damage. Companies
            that would rather hire slow and hire right.
          </p>
          <p>
            It is not for everyone. That's fine. We'd rather be the right platform for a few than a
            mediocre platform for many.
          </p>
        </section>

        {/* Stats interlude — three data points displayed in a grid */}
        <div className="my-16 grid gap-px rounded-2xl border border-border overflow-hidden sm:grid-cols-3">
          {[
            { v: "94%", label: "of companies report better fit vs. prior process" },
            { v: "3×", label: "more recruiter views on verified skill profiles" },
            { v: "6d", label: "average time from challenge submission to offer" },
          ].map((s) => (
            <div key={s.label} className="bg-card p-7">
              <div className="font-display text-4xl">{s.v}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section 4: What we're building toward */}
        <section className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <h2 className="font-display text-3xl text-foreground">What we're building toward.</h2>
          <p>
            A world where the best person for a role finds it — and where companies compete for
            talent by being genuinely good employers, not by being clever at sourcing.
          </p>
          <p>
            That sounds ambitious. It is. But the mechanism is simple: make the truth visible. Make
            skill visible. Make track records visible. Make how companies treat people visible.
          </p>
          <p>
            Markets work when they have good information. Hiring markets have terrible information.
            We're fixing the information problem.
          </p>
        </section>

        {/* Letter-style closing with dual CTAs */}
        <div className="mt-20 border-t border-border pt-10 space-y-3 text-foreground/85">
          <p className="text-lg leading-relaxed">
            If this is how you want to hire, or how you want to be hired — come in.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {/* NAVIGATION: Link to the talent marketing page */}
            <Link
              to="/talent"
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90"
            >
              I'm looking for work →
            </Link>
            {/* NAVIGATION: Link to the companies marketing page */}
            <Link
              to="/companies"
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-accent"
            >
              I'm hiring →
            </Link>
          </div>
          <p className="mt-10 text-sm text-muted-foreground">— The Skill Network team</p>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
