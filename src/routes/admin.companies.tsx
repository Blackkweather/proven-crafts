import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchAllUsers,
  fetchJobs,
  fetchChallenges,
  type Profile,
  type Job,
  type Challenge,
} from "@/lib/db";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

function AdminCompanies() {
  const [companies, setCompanies] = useState<Profile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchAllUsers(), fetchJobs(), fetchChallenges()])
      .then(([users, allJobs, allChallenges]) => {
        if (cancelled) return;
        setCompanies((users as Profile[]).filter((u) => u.account_type === "company"));
        setJobs(allJobs);
        setChallenges(allChallenges);
      })
      .catch((err) => {
        if (!cancelled)
          console.error(
            "Failed to load companies data:",
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

  if (loading) return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {`${companies.length} active companies on the network`}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
          {companies.map((c) => {
            const cJobs = jobs.filter((j) => j.company_id === c.id).length;
            const cCh = challenges.filter((ch) => ch.company_id === c.id).length;
            const companyName = c.company_name ?? c.display_name;
            const initials = c.company_initials ?? companyName.slice(0, 2).toUpperCase();

            return (
              <article key={c.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-foreground text-background font-display">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xl">{companyName}</span>
                      {c.anti_ghosting_badge && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Anti-ghosting
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.company_industry ?? "—"} · {c.company_size ?? "—"} · {c.total_hires} hires
                    </div>
                  </div>
                  <button className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">
                    Manage
                  </button>
                </div>
                {c.company_about && (
                  <p className="mt-3 text-sm text-muted-foreground">{c.company_about}</p>
                )}
                <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-paper text-center">
                  <Stat n={cJobs} l="Roles" />
                  <Stat n={cCh} l="Challenges" />
                  <Stat
                    n={c.trust_score != null ? `${c.trust_score}` : "—"}
                    l="Trust"
                    highlight={c.anti_ghosting_badge}
                  />
                </div>
              </article>
            );
          })}

          {companies.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
              No companies found.
            </p>
          )}
        </div>
    </div>
  );
}

function Stat({ n, l, highlight }: { n: number | string; l: string; highlight?: boolean }) {
  return (
    <div className="px-3 py-3">
      <div className={`font-display text-xl ${highlight ? "text-primary" : ""}`}>{n}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );
}
