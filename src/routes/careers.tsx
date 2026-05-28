// =============================================================================
// CAREERS PAGE — src/routes/careers.tsx
// =============================================================================
// Static page listing open roles at Skill Network and explaining how the team
// works and how they hire. No data fetching — all content is defined in the
// `openings` and `principles` arrays at the top of the file.
//
// The hiring process is transparent: 30-min call, paid scoped trial (€600),
// team day, and a decision within 5 working days. Each open role links to the
// contact page (individual job pages not yet built). Sets SEO meta tags.
//
// KEYWORDS: NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

// NAVIGATION: Route definition with SEO meta tags.
export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Skill Network" },
      {
        name: "description",
        content: "Join the team building a hiring platform around proven skills.",
      },
      { property: "og:title", content: "Careers — Skill Network" },
      {
        property: "og:description",
        content: "We're a small studio building a different shape for hiring. Come build with us.",
      },
    ],
  }),
  component: CareersPage,
});


// Three "how we work" principles shown at the bottom of the page.
const principles = [
  {
    t: "Show, don't tell",
    b: "Every person we hire shipped something concrete to get here. We do the same internally.",
  },
  {
    t: "Calm focus",
    b: "No notification floods, no perma-meetings. Long stretches of deep work, defended.",
  },
  {
    t: "Editorial taste",
    b: "We treat product like a publication. Clear voice, considered surfaces, pride in the craft.",
  },
];

function CareersPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero — headline + hiring process sidebar card */}
      <section className="container mx-auto px-6 pb-16 pt-20 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Careers
            </div>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">
              Build the network you'd want to be hired through.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              We're a 14-person studio designing a hiring platform that respects both sides of the
              table. We hire the way we ask companies to: by reviewing real work.
            </p>
          </div>
          {/* How we hire: 4-step process shown as an ordered list */}
          <div className="lg:col-span-5">
            <div className="surface-paper rounded-2xl p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                How we hire
              </div>
              <ol className="mt-4 space-y-4 text-sm">
                <Li n="01" t="Conversation" b="A 30-minute call with the hiring lead, no script." />
                <Li n="02" t="Paid trial" b="A short, scoped piece of real work — €600 flat." />
                <Li n="03" t="Team day" b="Shadow the team for a day, async or onsite." />
                <Li n="04" t="Offer" b="Decision in 5 working days. We tell you either way." />
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Open roles list */}
      <section className="border-y border-border bg-paper">
        <div className="container mx-auto px-6 py-20">
          <h2 className="font-display text-3xl">Open roles</h2>
          <div className="mt-8 rounded-2xl border border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">
            No open roles at this time. Check back soon — or send a speculative application via the{" "}
            <Link to="/contact" className="underline hover:text-foreground">
              contact page
            </Link>
            .
          </div>
        </div>
      </section>

      {/* How we work — 3 principles in a grid */}
      <section className="container mx-auto px-6 py-24">
        <h2 className="font-display text-3xl">How we work</h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.t} className="bg-background p-8">
              <div className="font-display text-xl">{p.t}</div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.b}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

// ─── Li ───────────────────────────────────────────────────────────────────────
// A numbered list item used in the "how we hire" process card.
// n = step number, t = step title, b = step description.
function Li({ n, t, b }: { n: string; t: string; b: string }) {
  return (
    <li className="flex gap-4">
      <span className="font-mono text-xs text-muted-foreground">{n}</span>
      <div>
        <div className="font-medium">{t}</div>
        <div className="text-muted-foreground">{b}</div>
      </div>
    </li>
  );
}
