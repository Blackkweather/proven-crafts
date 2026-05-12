import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  fetchTalentMatches,
  updateMatchStatus,
  getOrCreateConversation,
  type Match,
} from "@/lib/db";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/app/matches")({
  component: MatchesPage,
});

function MatchesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchTalentMatches(user.id)
      .then((rows) => {
        if (!cancelled) setMatches(rows);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function respond(match: Match, status: "confirmed" | "declined") {
    setActing(match.id);
    try {
      await updateMatchStatus(match.id, status);
      setMatches((prev) => prev.map((m) => (m.id === match.id ? { ...m, status } : m)));
      if (status === "confirmed" && user?.id) {
        const conv = await getOrCreateConversation(user.id, match.company_id);
        router.navigate({ to: "/app/inbox", search: { conv: conv.id } });
      }
    } finally {
      setActing(null);
    }
  }

  const pending = matches.filter((m) => m.status === "pending");
  const confirmed = matches.filter((m) => m.status === "confirmed");
  const declined = matches.filter((m) => m.status === "declined");

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-2xl space-y-10">
      {/* Pending invites */}
      <section>
        <h2 className="font-display text-2xl">Match invites</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Companies that want to connect with you. Accept to open a conversation.
        </p>
        <div className="mt-5 space-y-3">
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No pending invites — keep building your profile.
            </div>
          ) : (
            pending.map((m) => (
              <MatchCard key={m.id} match={m} acting={acting} onRespond={respond} />
            ))
          )}
        </div>
      </section>

      {/* Confirmed */}
      {confirmed.length > 0 && (
        <section>
          <h2 className="font-display text-2xl">Connected</h2>
          <div className="mt-5 space-y-3">
            {confirmed.map((m) => (
              <MatchCard key={m.id} match={m} acting={acting} onRespond={respond} />
            ))}
          </div>
        </section>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-muted-foreground">Passed</h2>
          <div className="mt-5 space-y-3">
            {declined.map((m) => (
              <MatchCard key={m.id} match={m} acting={acting} onRespond={respond} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MatchCard({
  match,
  acting,
  onRespond,
}: {
  match: Match;
  acting: string | null;
  onRespond: (m: Match, s: "confirmed" | "declined") => void;
}) {
  const company = match.company as
    | {
        display_name?: string;
        company_name?: string;
        company_industry?: string;
        trust_score?: number | null;
      }
    | undefined;
  const companyName = company?.company_name ?? company?.display_name ?? "Unknown company";
  const industry = company?.company_industry;
  const trust = company?.trust_score;
  const isActing = acting === match.id;

  const statusBadge: Record<string, string> = {
    pending: "bg-primary/10 text-primary",
    confirmed: "bg-green-100 text-green-800",
    declined: "bg-muted text-muted-foreground",
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-lg">{companyName}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusBadge[match.status] ?? ""}`}
            >
              {match.status}
            </span>
          </div>
          {industry && <div className="mt-0.5 text-xs text-muted-foreground">{industry}</div>}
          {trust != null && (
            <div className="mt-1 text-xs text-muted-foreground">Trust score: {trust}</div>
          )}
        </div>

        {match.status === "pending" && (
          <div className="flex shrink-0 gap-2">
            <button
              disabled={isActing}
              onClick={() => onRespond(match, "confirmed")}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              {isActing ? "…" : "Accept"}
            </button>
            <button
              disabled={isActing}
              onClick={() => onRespond(match, "declined")}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
