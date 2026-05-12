import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  fetchModerationQueue,
  updateSubmissionStatus,
  suspendUser,
  type Submission,
} from "@/lib/db";

export const Route = createFileRoute("/admin/moderation")({
  component: Moderation,
});

function Moderation() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchModerationQueue()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function resolve(id: string) {
    setActing(id);
    try {
      await updateSubmissionStatus(id, "reviewed");
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  async function suspend(submission: Submission) {
    setActing(submission.id);
    try {
      await updateSubmissionStatus(submission.id, "reviewed");
      await suspendUser(submission.talent_id);
      setItems((xs) => xs.filter((x) => x.id !== submission.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading queue…</div>;
  }

  return (
    <div className="max-w-3xl">
      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {items.length} submission{items.length !== 1 ? "s" : ""} pending review
        {items.length === 0 ? " · queue is calm" : ""}
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-paper p-12 text-center">
          <div className="font-display text-2xl">All clear.</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing in the queue. Good time for tea.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((s) => {
            const talent = s.talent as { display_name?: string } | undefined;
            const challenge = s.challenge as { title?: string } | undefined;
            const talentName = talent?.display_name ?? s.talent_id.slice(0, 8);
            const challengeTitle = challenge?.title ?? s.challenge_id.slice(0, 8);
            const age = formatAge(s.created_at);

            return (
              <article key={s.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      submission
                    </span>
                    <h3 className="mt-2 font-display text-lg">{challengeTitle}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Submitted by {talentName}</p>
                    {s.work_url && (
                      <a
                        href={s.work_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs text-primary underline-offset-4 hover:underline"
                      >
                        View work →
                      </a>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">Submitted {age} ago</div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      disabled={acting === s.id}
                      onClick={() => resolve(s.id)}
                      className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background hover:bg-foreground/90 disabled:opacity-50"
                    >
                      {acting === s.id ? "…" : "Resolve"}
                    </button>
                    <button
                      disabled={acting === s.id}
                      onClick={() => suspend(s)}
                      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/15 disabled:opacity-50"
                    >
                      {acting === s.id ? "…" : "Suspend user"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
