import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/company/analytics")({
  component: AnalyticsPage,
});

interface ChallengeAnalytic {
  challenge_id: string;
  title: string;
  status: string;
  created_at: string;
  deadline_at: string;
  total_submissions: number;
  reviewed_submissions: number;
  avg_match_score: number | null;
  first_submission_at: string | null;
  hours_to_first_submission: number | null;
}

interface PipelineStat {
  status: string;
  count: number;
}

function fmt(n: number | null, decimals = 0) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(decimals);
}

function hoursLabel(h: number | null) {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<ChallengeAnalytic[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;

        const { data: jobsData } = await supabase
          .from("jobs")
          .select("id")
          .eq("company_id", user!.id);
        const jobIds = jobsData?.map((j) => j.id) ?? [];

        const [analyticsRes, pipelineRes] = await Promise.all([
          db
            .from("challenge_analytics")
            .select("*")
            .eq("company_id", user!.id)
            .order("created_at", { ascending: false }),
          jobIds.length > 0
            ? supabase.from("applications").select("status").in("job_id", jobIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (analyticsRes.error) throw new Error(analyticsRes.error.message);
        if (pipelineRes.error) throw new Error(pipelineRes.error.message);

        setAnalytics((analyticsRes.data as unknown as ChallengeAnalytic[]) ?? []);

        const counts: Record<string, number> = {};
        for (const row of pipelineRes.data ?? []) {
          counts[row.status] = (counts[row.status] ?? 0) + 1;
        }
        setPipeline(Object.entries(counts).map(([status, count]) => ({ status, count })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const totalSubmissions = analytics.reduce((s, a) => s + (a.total_submissions ?? 0), 0);
  const scoredRows = analytics.filter((a) => a.avg_match_score !== null);
  const avgMatchScore = scoredRows.length
    ? scoredRows.reduce((s, a) => s + a.avg_match_score!, 0) / scoredRows.length
    : null;
  const fastestFirstSub = analytics
    .filter((a) => a.hours_to_first_submission !== null)
    .sort((a, b) => (a.hours_to_first_submission ?? 0) - (b.hours_to_first_submission ?? 0))[0];

  const PIPELINE_ORDER = ["applied", "screening", "interview", "offer", "hired", "rejected"];

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl">Analytics</h1>
        </div>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Performance across your challenges and hiring pipeline.</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total submissions", value: totalSubmissions.toString() },
          { label: "Avg match score", value: avgMatchScore !== null ? `${fmt(avgMatchScore)}%` : "—" },
          { label: "Fastest time-to-submission", value: hoursLabel(fastestFirstSub?.hours_to_first_submission ?? null) },
        ].map(({ label, value }) => (
          <div key={label} className="surface-paper rounded-2xl p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            <div className="mt-2 font-display text-4xl">{value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      {pipeline.length > 0 && (
        <section className="surface-paper rounded-2xl p-6">
          <h2 className="font-display text-xl">Application pipeline</h2>
          <div className="mt-6 space-y-3">
            {PIPELINE_ORDER.filter((s) => pipeline.find((p) => p.status === s)).map((status) => {
              const p = pipeline.find((p) => p.status === status)!;
              const total = pipeline.reduce((s, p) => s + p.count, 0);
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-4">
                  <div className="w-24 shrink-0 text-sm capitalize text-muted-foreground">{status}</div>
                  <div className="flex-1 overflow-hidden rounded-full bg-muted h-2">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-12 shrink-0 text-right text-sm font-medium">{p.count}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Challenge performance table */}
      <section className="surface-paper rounded-2xl p-6">
        <h2 className="font-display text-xl">Challenge performance</h2>
        {loading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : analytics.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No challenges yet. Post one to start tracking performance.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-3 pr-4">Challenge</th>
                  <th className="pb-3 px-4 text-right">Submissions</th>
                  <th className="pb-3 px-4 text-right">Avg score</th>
                  <th className="pb-3 px-4 text-right">Time to first</th>
                  <th className="pb-3 pl-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.map((a) => (
                  <tr key={a.challenge_id} className="hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium">{a.title}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{a.total_submissions}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {a.avg_match_score !== null ? `${fmt(a.avg_match_score)}%` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {hoursLabel(a.hours_to_first_submission)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        a.status === "open"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
