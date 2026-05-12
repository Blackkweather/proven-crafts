import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProfile, useJobs, useChallenges, useNotifications } from "@/lib/hooks";
import { SkillTag } from "@/components/skill-tag";
import { MatchBar, MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

function calcMatch(required: string[], userSkills: { name: string }[]): number {
  if (!required || required.length === 0) return 0;
  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());
  const matched = required.filter((r) => userSkillNames.includes(r.toLowerCase())).length;
  return Math.round((matched / required.length) * 100);
}

function daysLeft(deadline_at: string): number {
  return Math.max(0, Math.ceil((new Date(deadline_at).getTime() - Date.now()) / 86400000));
}

function Overview() {
  const { user } = useAuth();
  const { profile, skills, loading: profileLoading } = useProfile(user?.id);
  const { jobs, loading: jobsLoading } = useJobs();
  const { challenges, loading: challengesLoading } = useChallenges();
  const { notifications, loading: notificationsLoading } = useNotifications(user?.id);

  const userSkills = skills ?? [];

  const matchedJobs = jobs
    ? jobs
        .map((j) => ({ ...j, score: calcMatch(j.required_skills ?? [], userSkills) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : [];

  const matchedChallenges = challenges
    ? challenges
        .map((c) => ({ ...c, score: calcMatch(c.required_skills ?? [], userSkills) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
    : [];

  const completeness = profile?.completeness_pct ?? 0;

  return (
    <div className="grid gap-8 xl:grid-cols-3">
      <div className="xl:col-span-2 space-y-8">
        {/* Profile completeness */}
        <section className="surface-paper rounded-2xl p-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Profile signal
              </div>
              {profileLoading ? (
                <div className="mt-2 h-7 w-64 animate-pulse rounded bg-muted" />
              ) : (
                <h2 className="mt-2 font-display text-2xl">
                  Your profile is reading at <span className="text-primary">{completeness}%</span>{" "}
                  strength.
                </h2>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                Add one more shipped project to cross 90% — it doubles your visibility on company
                shortlists.
              </p>
            </div>
            <Link
              to="/app/profile"
              className="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
            >
              Refine →
            </Link>
          </div>
          <div className="mt-5">
            <MatchBar value={completeness} />
          </div>
        </section>

        {/* Top job matches */}
        <section>
          <SectionHead
            title="Roles aligned to your work"
            link={{ to: "/app/jobs", label: "All jobs" }}
          />
          <div className="mt-4 space-y-3">
            {jobsLoading ? (
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))
            ) : matchedJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs available right now.</p>
            ) : (
              matchedJobs.map((j) => {
                const companyName = j.company?.company_name ?? j.company?.display_name ?? "Company";
                return (
                  <Link
                    key={j.id}
                    to="/app/jobs"
                    className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{companyName}</span>
                          <span>·</span>
                          <span>{j.location}</span>
                          <span>·</span>
                          <span>{j.arrangement}</span>
                        </div>
                        <h3 className="mt-1 font-display text-lg">{j.title}</h3>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(j.required_skills ?? []).slice(0, 4).map((s) => (
                            <span
                              key={s}
                              className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <MatchScore value={j.score} size="md" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Challenges */}
        <section>
          <SectionHead
            title="Challenges to win"
            link={{ to: "/app/challenges", label: "All challenges" }}
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {challengesLoading ? (
              [0, 1].map((i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))
            ) : matchedChallenges.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-2">
                No challenges available right now.
              </p>
            ) : (
              matchedChallenges.map((c) => {
                const companyName = c.company?.company_name ?? c.company?.display_name ?? "Company";
                const days = c.deadline_at ? daysLeft(c.deadline_at) : 0;
                return (
                  <Link
                    key={c.id}
                    to="/app/challenges"
                    className="group rounded-2xl border border-border bg-foreground p-5 text-background transition-all hover:shadow-elevated"
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-background/60">
                      <span>{companyName}</span>
                      <span>{days}d left</span>
                    </div>
                    <h3 className="mt-3 font-display text-lg leading-snug">{c.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs text-background/70">{c.brief}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-mono text-xs text-background/60">
                        {c.submissions_count ?? 0} submissions
                      </span>
                      <span className="font-display text-lg text-primary">
                        {c.score}
                        <span className="text-[0.6em] text-background/50">%</span>
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Right column */}
      <aside className="space-y-6">
        <div className="surface-paper rounded-2xl p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Your top skills
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profileLoading ? (
              <div className="h-16 w-full animate-pulse rounded bg-muted" />
            ) : userSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground">No skills added yet.</p>
            ) : (
              userSkills.map((s) => (
                <SkillTag
                  key={s.name}
                  skill={{ name: s.name, level: s.level, verifiedBy: s.verified_by ?? undefined }}
                  tone={s.level === "expert" ? "primary" : "default"}
                />
              ))
            )}
          </div>
        </div>
        <div className="surface-paper rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Activity
            </div>
            <Link
              to="/app/notifications"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              All →
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {notificationsLoading ? (
              [0, 1, 2, 3].map((i) => <li key={i} className="h-8 animate-pulse rounded bg-muted" />)
            ) : !notifications || notifications.length === 0 ? (
              <li className="text-xs text-muted-foreground">No recent activity.</li>
            ) : (
              notifications.slice(0, 4).map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span
                    className={
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " +
                      (n.read_at ? "bg-border" : "bg-primary")
                    }
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{n.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                  </div>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))
            )}
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
      <Link to={link.to as string} className="text-sm text-muted-foreground hover:text-foreground">
        {link.label} →
      </Link>
    </div>
  );
}
