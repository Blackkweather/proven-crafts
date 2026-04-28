import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "Press — Skill Network" },
      { name: "description", content: "Press kit, founder quotes, and recent coverage of Skill Network." },
      { property: "og:title", content: "Press — Skill Network" },
      { property: "og:description", content: "Founder quotes, brand assets, and coverage." },
    ],
  }),
  component: PressPage,
});

const coverage = [
  { outlet: "Sifted", title: "Skill Network bets that resumes are over", date: "Mar 2026" },
  { outlet: "TechCrunch EU", title: "Berlin's Skill Network raises €6M to rebuild hiring around proof of work", date: "Feb 2026" },
  { outlet: "The Generalist", title: "Why the next great hiring company won't look like LinkedIn", date: "Jan 2026" },
  { outlet: "Lenny's Newsletter", title: "Skill-first hiring: a field guide", date: "Nov 2025" },
];

function PressPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <section className="container mx-auto px-6 pb-16 pt-20 lg:pt-28">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Press</div>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">
          A different shape for hiring,
          <br />
          <span className="italic text-muted-foreground">in the words of others.</span>
        </h1>
      </section>

      <section className="border-y border-border bg-paper">
        <div className="container mx-auto grid gap-12 px-6 py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="font-display text-3xl">Press kit</h2>
            <p className="mt-3 text-muted-foreground">
              Logos, founder portraits, product screenshots, and the one-pager. Updated quarterly.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Request press kit →
            </Link>
          </div>
          <div className="grid gap-6 lg:col-span-8 md:grid-cols-2">
            <Quote
              by="Naomi Adler, Co-founder & CEO"
              q="The resume is a 19th-century artifact pretending to do 21st-century work. We're returning hiring to what it used to be: looking at someone's craft."
            />
            <Quote
              by="Ivo Mendes, Co-founder & CTO"
              q="A match score should be defensible. If we can't explain why two people belong on a call, we shouldn't put them on one."
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24">
        <h2 className="font-display text-3xl">Recent coverage</h2>
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          {coverage.map((c, i) => (
            <a
              key={c.title}
              href="#"
              className={"flex items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-accent " + (i ? "border-t border-border" : "")}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{c.outlet}</div>
                <div className="mt-1 font-display text-lg">{c.title}</div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{c.date}</span>
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Quote({ q, by }: { q: string; by: string }) {
  return (
    <blockquote className="surface-paper rounded-2xl p-6">
      <p className="font-display text-xl leading-snug">"{q}"</p>
      <footer className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">— {by}</footer>
    </blockquote>
  );
}
