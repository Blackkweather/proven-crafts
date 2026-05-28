import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { fetchCompanyMatches, updateMatchStatus, type Match, type MatchStatus } from "@/lib/db";

export const Route = createFileRoute("/company/matches")({
  component: CompanyMatchesPanel,
});

const STATUS_LABELS: Record<MatchStatus, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  declined: "Declined",
};

const STATUS_STYLES: Record<MatchStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  declined: "bg-destructive/10 text-destructive border-destructive/20",
};

function CompanyMatchesPanel() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchCompanyMatches(user.id)
      .then(setMatches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleWithdraw(matchId: string) {
    setWithdrawing(matchId);
    try {
      await updateMatchStatus(matchId, "declined");
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, status: "declined" } : m)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setWithdrawing(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const pending = matches.filter((m) => m.status === "pending");
  const confirmed = matches.filter((m) => m.status === "confirmed");
  const declined = matches.filter((m) => m.status === "declined");

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border">
        <div className="text-4xl mb-4">🤝</div>
        <h3 className="font-display text-lg">No match invites yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Browse the talent directory and send invites to candidates you're interested in.
        </p>
        <Link
          to="/company/talent"
          className="mt-5 rounded-md bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90"
        >
          Find Talent →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {matches.length} invite{matches.length !== 1 ? "s" : ""} sent ·{" "}
          <span className="text-amber-600">{pending.length} pending</span> ·{" "}
          <span className="text-emerald-600">{confirmed.length} accepted</span>
        </p>
        <Link
          to="/company/talent"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
        >
          + Invite more
        </Link>
      </div>

      {[
        { label: "Pending", items: pending },
        { label: "Accepted", items: confirmed },
        { label: "Declined", items: declined },
      ]
        .filter(({ items }) => items.length > 0)
        .map(({ label, items }) => (
          <section key={label}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {label} · {items.length}
            </h2>
            <div className="space-y-3">
              {items.map((match) => {
                const talent = match.talent as {
                  id: string;
                  display_name: string;
                  headline?: string;
                  avatar_url?: string;
                  availability?: string;
                } | undefined;

                return (
                  <article
                    key={match.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-soft"
                  >
                    <div className="flex items-center gap-4">
                      {talent?.avatar_url ? (
                        <img
                          src={talent.avatar_url}
                          alt={talent.display_name}
                          className="h-10 w-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                          {talent?.display_name?.charAt(0) ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-display text-base leading-snug">
                          {talent?.display_name ?? "Unknown talent"}
                        </div>
                        {talent?.headline && (
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {talent.headline}
                          </div>
                        )}
                        {talent?.availability && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {talent.availability}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[match.status]}`}
                      >
                        {STATUS_LABELS[match.status]}
                      </span>

                      {talent?.id && (
                        <Link
                          to="/talent/$talentId"
                          params={{ talentId: talent.id }}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
                        >
                          View
                        </Link>
                      )}

                      {match.status === "pending" && (
                        <button
                          onClick={() => handleWithdraw(match.id)}
                          disabled={withdrawing === match.id}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
                        >
                          {withdrawing === match.id ? "…" : "Withdraw"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
    </div>
  );
}
