import { createFileRoute, Link } from "@tanstack/react-router";
import { currentTalent, jobs, challenges, matchScore, notifications, getCompany } from "@/lib/mock-data";
import { SkillTag } from "@/components/skill-tag";
import { MatchBar, MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

function Overview() {
  const matchedJobs = jobs
    .map((j) => ({ ...j, score: matchScore(j.requiredSkills, currentTalent.skills) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const matchedChallenges = challenges
    .map((c) => ({ ...c, score: matchScore(c.requiredSkills, currentTalent.skills) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return (
    <div className="grid gap-8 xl:grid-cols-3">
      <div className="xl:col-span-2 space-y-8">
        {/* Profile completeness */}
        <section className="surface-paper rounded-2xl p-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Profile signal</div>
              <h2 className="mt-2 font-display text-2xl">Your profile is reading at <span className="text-primary">{currentTalent.completeness}%</span> strength.</h2>
              <p className="mt-1 text-sm text-muted-foreground">Add one more shipped project to cross 90% — it doubles your visibility on company shortlists.</p>
            </div>
            <Link to="/app/profile" className="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent">
              Refine →
            </Link>
          </div>
          <div className="mt-5"><MatchBar value={currentTalent.completeness} /></div>
        </section>

        {/* Top job matches */}
        <section>
          <SectionHead title="Roles aligned to your work" link={{ to: "/app/jobs", label: "All jobs" }} />
          <div className="mt-4 space-y-3">
            {matchedJobs.map((j) => {
              const co = getCompany(j.companyId);
              return (
                <Link key={j.id} to="/app/jobs" className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-soft">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{co.name}</span>
                        <span>·</span><span>{j.location}</span>
                        <span>·</span><span>{j.arrangement}</span>
                      </div>
                      <h3 className="mt-1 font-display text-lg">{j.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {j.requiredSkills.slice(0, 4).map((s) => (
                          <span key={s} className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    </div>
                    <MatchScore value={j.score} size="md" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Challenges */}
        <section>
          <SectionHead title="Challenges to win" link={{ to: "/app/challenges", label: "All challenges" }} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {matchedChallenges.map((c) => {
              const co = getCompany(c.companyId);
              return (
                <Link key={c.id} to="/app/challenges" className="group rounded-2xl border border-border bg-foreground p-5 text-background transition-all hover:shadow-elevated">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-background/60">
                    <span>{co.name}</span><span>{c.deadlineDays}d left</span>
                  </div>
                  <h3 className="mt-3 font-display text-lg leading-snug">{c.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-background/70">{c.brief}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-xs text-background/60">{c.submissions} submissions</span>
                    <span className="font-display text-lg text-primary">{c.score}<span className="text-[0.6em] text-background/50">%</span></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right column */}
      <aside className="space-y-6">
        <div className="surface-paper rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your top skills</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {currentTalent.skills.map((s) => (
              <SkillTag key={s.name} skill={s} tone={s.level === "expert" ? "primary" : "default"} />
            ))}
          </div>
        </div>
        <div className="surface-paper rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Activity</div>
            <Link to="/app/notifications" className="text-xs text-muted-foreground hover:text-foreground">All →</Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="flex gap-3">
                <span className={"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " + (n.read ? "bg-border" : "bg-primary")} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{n.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                </div>
                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{n.at}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function SectionHead({ title, link }: { title: string; link: { to: string; label: string } }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="font-display text-2xl">{title}</h2>
      <Link to={link.to as string} className="text-sm text-muted-foreground hover:text-foreground">{link.label} →</Link>
    </div>
  );
}
