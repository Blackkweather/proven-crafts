import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchAllUsers,
  fetchModerationQueue,
  fetchChallenges,
  fetchJobs,
  fetchNetworkPulse,
  fetchTrustStats,
  type Profile,
  type DayCount,
  type TrustStats,
} from "@/lib/db";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [talentCount, setTalentCount] = useState<number | null>(null);
  const [companyCount, setCompanyCount] = useState<number | null>(null);
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [challengeCount, setChallengeCount] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [pulse, setPulse] = useState<DayCount[]>([]);
  const [trust, setTrust] = useState<TrustStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchAllUsers(),
      fetchJobs(),
      fetchChallenges(),
      fetchModerationQueue(),
      fetchNetworkPulse(),
      fetchTrustStats(),
    ])
      .then(([users, jobs, challenges, queue, pulseData, trustData]) => {
        if (cancelled) return;
        const talent = (users as Profile[]).filter((u) => u.account_type === "talent");
        const companies = (users as Profile[]).filter((u) => u.account_type === "company");
        setTalentCount(talent.length);
        setCompanyCount(companies.length);
        setJobCount(jobs.length);
        setChallengeCount(challenges.length);
        setQueueCount(queue.length);
        setPulse(pulseData);
        setTrust(trustData);
      })
      .catch((err) => {
        if (!cancelled)
          console.error(
            "Admin overview load failed:",
            err instanceof Error ? err.message : String(err),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number | null) => (loading || n === null ? "…" : String(n));

  const stats = [
    { k: "Talent", v: fmt(talentCount), sub: "Active profiles" },
    { k: "Companies", v: fmt(companyCount), sub: "On the network" },
    { k: "Active roles", v: fmt(jobCount), sub: "Open jobs" },
    { k: "Open challenges", v: fmt(challengeCount), sub: `${fmt(queueCount)} pending review` },
  ];

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

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl">Profile views · last 7 days</h3>
          <div className="mt-6 grid grid-cols-7 items-end gap-2 h-40">
            {pulse.length > 0
              ? (() => {
                  const max = Math.max(...pulse.map((p) => p.count), 1);
                  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
                  return pulse.map((p, i) => (
                    <div key={p.day} className="flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t bg-foreground/85 transition-all hover:bg-primary"
                        style={{ height: `${Math.max(4, (p.count / max) * 100)}%` }}
                        title={`${p.count} views`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {dayLabels[new Date(p.day + "T12:00:00").getDay()]}
                      </span>
                    </div>
                  ));
                })()
              : Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-full rounded-t bg-foreground/10" style={{ height: "4%" }} />
                    <span className="text-[10px] text-muted-foreground">
                      {["S", "M", "T", "W", "T", "F", "S"][i]}
                    </span>
                  </div>
                ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-foreground p-6 text-background">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
            Network trust
          </div>
          <div className="mt-2 font-display text-5xl">{trust ? `${trust.verifiedPct}%` : "…"}</div>
          <p className="mt-2 text-sm text-background/70">
            Verified profiles, signal quality, and dispute rate combined.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              ["Verified", trust ? `${trust.verifiedPct}%` : "…"],
              ["Avg signal", trust ? `${trust.avgCompleteness}%` : "…"],
              ["Queue rate", trust ? `${trust.disputeRate}%` : "…"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-background/5 p-2">
                <div className="text-[10px] uppercase tracking-widest text-background/60">{k}</div>
                <div className="font-display text-base">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
