import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useJobs } from "@/lib/hooks";
import { useChallenges } from "@/lib/hooks";
import { useCompanyPipeline } from "@/lib/hooks";
import { MatchBar } from "@/components/match-score";

export const Route = createFileRoute("/company/")({
  component: CompanyOverview,
});

function CompanyOverview() {
  const { user } = useAuth();

  const { jobs: allJobs, loading: jobsLoading } = useJobs();
  const { challenges: allChallenges, loading: challengesLoading } = useChallenges();
  const { applications, loading: pipelineLoading } = useCompanyPipeline(user?.id);

  const companyJobs = allJobs.filter((j) => j.company_id === user?.id);
  const companyChallenges = allChallenges.filter((c) => c.company_id === user?.id);

  const loading = jobsLoading || challengesLoading || pipelineLoading;

  const avgMatch =
    applications.length > 0
      ? Math.round(
          applications.reduce((sum, a) => sum + (a.match_score ?? 0), 0) / applications.length,
        )
      : 0;

  const stats = [
    { k: "Open roles", v: companyJobs.length, sub: "from your postings" },
    { k: "Active challenges", v: companyChallenges.length, sub: "open for submissions" },
    { k: "In pipeline", v: applications.length, sub: "total applicants" },
    {
      k: "Avg. match",
      v: `${avgMatch}%`,
      sub: applications.length > 0 ? "across pipeline" : "no data yet",
    },
  ];

  const topCandidates = [...applications]
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, 5);

  const pipelineHealth = (["new", "reviewing", "interview", "offer"] as const).map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    count: applications.filter((a) => a.status === status).length,
  }));

  const pipelineMax = Math.max(...pipelineHealth.map((p) => p.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-muted-foreground animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="surface-paper rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {s.k}
            </div>
            <div className="mt-2 font-display text-4xl">{s.v}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl">Top candidates this week</h2>
            <Link
              to="/company/candidates"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              All →
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {topCandidates.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No applications yet.
              </div>
            ) : (
              topCandidates.map((a, i) => {
                const talent = a.talent;
                const jobTitle = a.job?.title ?? "";
                const displayName = talent?.display_name ?? "Unknown";
                const initials = displayName
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase();
                const daysAgo = Math.round(
                  (Date.now() - new Date(a.created_at).getTime()) / 86400000,
                );

                return (
                  <div
                    key={a.id}
                    className={
                      "grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 p-5 " +
                      (i > 0 ? "border-t border-border" : "")
                    }
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background font-display text-sm">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {jobTitle} · {daysAgo}d ago
                      </div>
                    </div>
                    <div className="hidden w-40 md:block">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>match</span>
                        <span className="font-mono">{a.match_score ?? 0}%</span>
                      </div>
                      <div className="mt-1">
                        <MatchBar value={a.match_score ?? 0} />
                      </div>
                    </div>
                    <span
                      className={
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest " +
                        statusTone(a.status)
                      }
                    >
                      {a.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-foreground p-6 text-background">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
              Quick action
            </div>
            <h3 className="mt-2 font-display text-2xl leading-snug">
              Post a challenge in 5 minutes.
            </h3>
            <p className="mt-2 text-sm text-background/70">
              Get focused submissions from the top of the network by tomorrow.
            </p>
            <Link
              to="/company/challenges"
              className="mt-5 inline-block rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-background/90"
            >
              New challenge
            </Link>
          </div>

          <div className="surface-paper rounded-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Pipeline health
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {pipelineHealth.map(({ label, count }) => (
                <li key={label}>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-display">{count}</span>
                  </div>
                  <div className="mt-1.5">
                    <MatchBar value={(count / pipelineMax) * 100} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {applications.length} applicants in your active pipeline
      </p>
    </div>
  );
}

function statusTone(s: string) {
  switch (s) {
    case "interview":
      return "border-primary/30 bg-primary/10 text-primary";
    case "offer":
      return "border-warm/40 bg-warm text-warm-foreground";
    case "rejected":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "reviewing":
      return "border-border bg-paper text-foreground";
    default:
      return "border-border bg-card text-muted-foreground";
  }
}
