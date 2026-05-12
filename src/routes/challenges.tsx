import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useChallenges } from "@/lib/hooks";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Open challenges — Skill Network" },
      {
        name: "description",
        content:
          "Real, paid skill challenges from companies hiring on Skill Network. Submit work, not a cover letter.",
      },
      { property: "og:title", content: "Open challenges — Skill Network" },
      {
        property: "og:description",
        content: "Submit work, not a cover letter. Real challenges from real teams.",
      },
    ],
  }),
  component: ChallengesIndex,
});

function daysLeft(deadline_at: string): number {
  return Math.max(0, Math.ceil((new Date(deadline_at).getTime() - Date.now()) / 86400000));
}

function ChallengesIndex() {
  const { challenges, loading } = useChallenges();

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <section className="container mx-auto px-6 pb-12 pt-20 lg:pt-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Open challenges
            </div>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">
              Show your work.
              <br />
              <span className="italic text-muted-foreground">Get hired for it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Companies post focused, scoped briefs — sometimes paid, sometimes a fast-track to
              hiring. You submit output, not a CV.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="surface-paper rounded-2xl p-6">
              <div className="grid grid-cols-3 divide-x divide-border text-center">
                <Stat n={loading ? "—" : String(challenges?.length ?? 0)} l="Live now" />
                <Stat n="73" l="Closed in 2026" />
                <Stat n="42%" l="Lead to interview" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-6 px-6 pb-24 md:grid-cols-2">
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ))
        ) : !challenges || challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-2">
            No challenges available right now.
          </p>
        ) : (
          challenges.map((c) => {
            const companyName = c.company?.company_name ?? c.company?.display_name;
            const days = c.deadline_at ? daysLeft(c.deadline_at) : 0;
            return (
              <Link
                key={c.id}
                to="/challenges/$challengeId"
                params={{ challengeId: c.id }}
                className="group rounded-2xl border border-border bg-foreground p-6 text-background transition-all hover:shadow-elevated"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-background/60">
                    {companyName} · {days} days left
                  </span>
                  <span className="font-mono text-xs text-background/60">
                    {c.submissions_count ?? 0} submissions
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl leading-snug">{c.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-background/70">{c.brief}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(c.required_skills ?? []).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-background/20 bg-background/10 px-2.5 py-1 text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-background/15 pt-4 text-xs">
                  <span className="text-background/60">{c.prize ?? "Fast-track interview"}</span>
                  <span className="font-mono opacity-70 transition-opacity group-hover:opacity-100">
                    View brief →
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="px-2">
      <div className="font-display text-2xl">{n}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );
}
