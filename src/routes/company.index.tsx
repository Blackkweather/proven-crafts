import { createFileRoute, Link } from "@tanstack/react-router";
import { jobs, challenges, applications, candidates, getTalent, matchScore, getJob } from "@/lib/mock-data";
import { MatchBar } from "@/components/match-score";

export const Route = createFileRoute("/company/")({
  component: CompanyOverview,
});

function CompanyOverview() {
  const stats = [
    { k: "Open roles", v: jobs.length, sub: "+1 this week" },
    { k: "Active challenges", v: challenges.length, sub: "73 submissions" },
    { k: "In pipeline", v: applications.length, sub: "9 new" },
    { k: "Avg. match", v: "84%", sub: "Top quartile" },
  ];

  const topCandidates = applications
    .map((a) => {
      const t = getTalent(a.talentId);
      const j = getJob(a.jobId);
      return { ...a, talent: t, jobTitle: j?.title ?? "" };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="surface-paper rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{s.k}</div>
            <div className="mt-2 font-display text-4xl">{s.v}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl">Top candidates this week</h2>
            <Link to="/company/candidates" className="text-sm text-muted-foreground hover:text-foreground">All →</Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {topCandidates.map((c, i) => (
              <div key={c.id} className={"grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 p-5 " + (i > 0 ? "border-t border-border" : "")}>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background font-display text-sm">{c.talent.initials}</div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{c.talent.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.jobTitle} · {c.appliedDays}d ago</div>
                </div>
                <div className="hidden w-40 md:block">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>match</span><span className="font-mono">{c.matchScore}%</span>
                  </div>
                  <div className="mt-1"><MatchBar value={c.matchScore} /></div>
                </div>
                <span className={"rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest " + statusTone(c.status)}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-foreground p-6 text-background">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-background/60">Quick action</div>
            <h3 className="mt-2 font-display text-2xl leading-snug">Post a challenge in 5 minutes.</h3>
            <p className="mt-2 text-sm text-background/70">Get focused submissions from the top of the network by tomorrow.</p>
            <Link to="/company/challenges" className="mt-5 inline-block rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background/90">
              New challenge
            </Link>
          </div>

          <div className="surface-paper rounded-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pipeline health</div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ["New", 9], ["Reviewing", 12], ["Interview", 8], ["Offer", 2],
              ].map(([k, v]) => (
                <li key={k as string}>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-display">{v}</span>
                  </div>
                  <div className="mt-1.5"><MatchBar value={(Number(v) / 12) * 100} /></div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Aside hint about candidates referenced */}
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{candidates.length} verified contributors in your active pool</p>
    </div>
  );
}

function statusTone(s: string) {
  switch (s) {
    case "interview": return "border-primary/30 bg-primary/10 text-primary";
    case "offer": return "border-warm/40 bg-warm text-warm-foreground";
    case "rejected": return "border-destructive/30 bg-destructive/10 text-destructive";
    case "reviewing": return "border-border bg-paper text-foreground";
    default: return "border-border bg-card text-muted-foreground";
  }
}
