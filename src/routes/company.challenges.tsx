import { createFileRoute } from "@tanstack/react-router";
import { challenges, submissions, getTalent } from "@/lib/mock-data";

export const Route = createFileRoute("/company/challenges")({
  component: ChallengesPanel,
});

function ChallengesPanel() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{challenges.length} active · {submissions.length} submissions across all briefs</p>
        <button className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90">+ New challenge</button>
      </div>

      <div className="space-y-4">
        {challenges.map((c) => {
          const subs = submissions.filter((s) => s.challengeId === c.id).sort((a, b) => b.matchScore - a.matchScore);
          return (
            <article key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <div className="text-xs text-muted-foreground">{c.deadlineDays}d left · {c.submissions} entries</div>
                  <h3 className="mt-1 font-display text-2xl leading-snug">{c.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{c.brief}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.requiredSkills.map((s) => (
                      <span key={s} className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
                <button className="shrink-0 rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent">Edit brief</button>
              </div>
              {subs.length > 0 && (
                <div className="border-t border-border bg-paper px-6 py-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Submissions</div>
                  <ul className="mt-3 space-y-2">
                    {subs.map((s) => {
                      const t = getTalent(s.talentId);
                      return (
                        <li key={s.id} className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background font-display text-xs">{t.initials}</div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{t.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{t.headline}</div>
                          </div>
                          <span className="text-xs text-muted-foreground">{s.submittedDays}d ago</span>
                          <span className="font-display text-lg text-primary">{s.matchScore}<span className="text-[0.5em] text-muted-foreground">%</span></span>
                          <button className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent">Review</button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
