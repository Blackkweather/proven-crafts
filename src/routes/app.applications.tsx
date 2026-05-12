import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useMyApplications, useMySubmissions } from "@/lib/hooks";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/app/applications")({
  component: ApplicationsPage,
});

const appStatusMeta: Record<string, { label: string; cls: string }> = {
  new: { label: "Submitted", cls: "border-border bg-paper text-muted-foreground" },
  reviewing: { label: "Reviewing", cls: "border-foreground/20 bg-paper text-foreground" },
  interview: { label: "Interview", cls: "border-primary/30 bg-primary/10 text-primary" },
  offer: { label: "Offer", cls: "border-warm/40 bg-warm text-warm-foreground" },
  rejected: { label: "Closed", cls: "border-destructive/30 bg-destructive/10 text-destructive" },
};

const subStatusMeta: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "border-border bg-paper text-muted-foreground" },
  submitted: { label: "Submitted", cls: "border-foreground/20 bg-paper text-foreground" },
  reviewed: { label: "Reviewed", cls: "border-primary/30 bg-primary/10 text-primary" },
  shortlisted: { label: "Shortlisted", cls: "border-warm/40 bg-warm text-warm-foreground" },
};

function ApplicationsPage() {
  const { user } = useAuth();
  const { applications, loading: appsLoading } = useMyApplications(user?.id);
  const { submissions, loading: subsLoading } = useMySubmissions(user?.id);

  const loading = appsLoading || subsLoading;
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-12">
      {/* Job applications */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Job applications</h2>
          <Link to="/app/jobs" className="text-sm text-muted-foreground hover:text-foreground">
            Browse jobs →
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {applications.length} application{applications.length !== 1 ? "s" : ""} · sorted by
          recency
        </p>

        {applications.length === 0 ? (
          <EmptyState
            label="No applications yet"
            sub="Apply to a role and your pipeline appears here."
            to="/app/jobs"
            cta="Find jobs"
          />
        ) : (
          <div className="mt-5 space-y-3">
            {applications.map((a) => {
              const job = (
                a as {
                  job?: { title: string; location: string; arrangement: string; comp: string };
                }
              ).job;
              const meta = appStatusMeta[a.status] ?? appStatusMeta.new;
              return (
                <article
                  key={a.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg">{job?.title ?? "Role"}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {job?.location && <span>{job.location}</span>}
                        {job?.arrangement && (
                          <>
                            <span>·</span>
                            <span>{job.arrangement}</span>
                          </>
                        )}
                        {job?.comp && (
                          <>
                            <span>·</span>
                            <span>{job.comp}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>
                          {new Date(a.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <MatchScore value={a.match_score} size="sm" />
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {a.status === "interview" && (
                    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                      Interview scheduled — check your inbox for details.
                    </div>
                  )}
                  {a.status === "offer" && (
                    <div className="mt-4 rounded-lg border border-warm/40 bg-warm p-3 text-sm font-medium text-warm-foreground">
                      Offer received — respond within 5 business days.
                    </div>
                  )}
                  {a.status === "rejected" && (
                    <div className="mt-4 text-xs text-muted-foreground">
                      Role closed or filled. You'll receive a brief note if feedback is available.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Challenge submissions */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Challenge submissions</h2>
          <Link
            to="/app/challenges"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Browse challenges →
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""} · reviewed by humans
        </p>

        {submissions.length === 0 ? (
          <EmptyState
            label="No submissions yet"
            sub="Take a challenge and show your work to companies."
            to="/app/challenges"
            cta="Find challenges"
          />
        ) : (
          <div className="mt-5 space-y-3">
            {submissions.map((s) => {
              const ch = (
                s as {
                  challenge?: { title: string; prize?: string | null; submissions_count?: number };
                }
              ).challenge;
              const meta = subStatusMeta[s.status] ?? subStatusMeta.submitted;
              return (
                <article
                  key={s.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-snug">
                        {ch?.title ?? "Challenge"}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          {new Date(s.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        {ch?.prize && (
                          <>
                            <span>·</span>
                            <span className="text-warm-foreground">{ch.prize}</span>
                          </>
                        )}
                        {ch?.submissions_count != null && (
                          <>
                            <span>·</span>
                            <span>{ch.submissions_count} total entries</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <MatchScore value={s.match_score} size="sm" />
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {s.status === "shortlisted" && (
                    <div className="mt-4 rounded-lg border border-warm/40 bg-warm p-3 text-sm font-medium text-warm-foreground">
                      Your submission was shortlisted — expect a message from the team shortly.
                    </div>
                  )}
                  {s.status === "reviewed" && (
                    <div className="mt-4 text-xs text-muted-foreground">
                      Reviewed by the team. Final decisions typically take 2–3 more business days.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({
  label,
  sub,
  to,
  cta,
}: {
  label: string;
  sub: string;
  to: string;
  cta: string;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-border p-12 text-center">
      <div className="font-display text-xl text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      <Link
        to={to as never}
        className="mt-5 inline-block rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90"
      >
        {cta}
      </Link>
    </div>
  );
}
