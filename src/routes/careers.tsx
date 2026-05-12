import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

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

const openings = [
  {
    id: "eng-staff",
    title: "Staff Product Engineer",
    team: "Engineering",
    location: "Berlin / Remote (EU)",
    type: "Full-time",
  },
  {
    id: "design-lead",
    title: "Design Lead, Talent Experience",
    team: "Design",
    location: "Berlin / Lisbon",
    type: "Full-time",
  },
  {
    id: "talent-partner",
    title: "Talent Partner",
    team: "Network",
    location: "Remote (EU)",
    type: "Full-time",
  },
  {
    id: "editorial",
    title: "Editorial Producer",
    team: "Brand",
    location: "Remote",
    type: "Contract",
  },
];

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

      <section className="border-y border-border bg-paper">
        <div className="container mx-auto px-6 py-20">
          <h2 className="font-display text-3xl">Open roles</h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-background">
            {openings.map((o, i) => (
              <Link
                key={o.id}
                to="/contact"
                className={
                  "group flex items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-accent " +
                  (i ? "border-t border-border" : "")
                }
              >
                <div className="min-w-0">
                  <div className="font-display text-lg">{o.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {o.team} · {o.location} · {o.type}
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                  Apply →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
