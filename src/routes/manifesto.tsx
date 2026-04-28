import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — Skill Network" },
      { name: "description", content: "Why we built a hiring platform around proven skills instead of resumes." },
    ],
  }),
  component: Manifesto,
});

function Manifesto() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <article className="container mx-auto max-w-3xl px-6 py-24">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Manifesto · 2026</div>
        <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">A quieter way to hire.</h1>
        <div className="mt-12 space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>The resume was invented for a different century. It compresses years of complicated work into bullet points written for keyword scanners.</p>
          <p className="italic text-muted-foreground">We think the work itself is a better signal than the document about the work.</p>
          <p>Skill Network is built on three small bets:</p>
          <ol className="space-y-4 pl-6 [&>li]:relative [&>li]:before:absolute [&>li]:before:-left-6 [&>li]:before:font-mono [&>li]:before:text-sm [&>li]:before:text-muted-foreground">
            <li className="before:content-['1.']">A profile should make a person legible to a stranger in 30 seconds.</li>
            <li className="before:content-['2.']">A challenge — small, focused, paid where possible — predicts on-the-job performance better than any interview loop.</li>
            <li className="before:content-['3.']">Match scores should be readable. Show your work, algorithm.</li>
          </ol>
          <p>That's it. The rest is a careful, intentional product built around those three ideas.</p>
        </div>
        <div className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
          — The Skill Network team
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
