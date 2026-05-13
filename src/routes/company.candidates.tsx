import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useCompanyPipeline } from "@/lib/hooks";
import {
  updateApplicationStatus,
  fetchApplicationVotes,
  upsertVote,
  fetchApplicationNotes,
  addApplicationNote,
  type ApplicationStatus,
  type CandidateVote,
  type CandidateNote,
  type Vote,
} from "@/lib/db";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/company/candidates")({
  component: Candidates,
});

const tabs = ["all", "new", "reviewing", "interview", "offer"] as const;
type Tab = (typeof tabs)[number];

function Candidates() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { applications, loading, refetch } = useCompanyPipeline(
    user?.id,
    tab === "all" ? undefined : tab,
  );

  async function moveStatus(appId: string, status: ApplicationStatus) {
    await updateApplicationStatus(appId, status);
    refetch();
  }

  if (loading)
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-lg border border-border bg-paper p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "rounded-md px-3 py-1.5 text-xs capitalize transition-colors " +
                (tab === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {applications.length} candidate{applications.length !== 1 ? "s" : ""} · ranked by match
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="font-display text-xl text-muted-foreground">No candidates yet</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Post a role or run a challenge to start building your pipeline.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {applications.map((a) => {
            const talent = (
              a as {
                talent?: {
                  display_name: string;
                  headline: string;
                  location: string;
                  bio: string;
                  skills?: Array<{ name: string; level: string }>;
                };
              }
            ).talent;
            const job = (a as { job?: { title: string } }).job;
            const isOpen = expanded === a.id;

            const initials =
              talent?.display_name
                ?.split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() ?? "?";

            return (
              <article
                key={a.id}
                className="overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-foreground/20"
              >
                <div
                  className="cursor-pointer p-6"
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-display">
                        {initials}
                      </div>
                      <div>
                        <div className="font-display text-lg">
                          {talent?.display_name ?? "Candidate"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {talent?.headline} {talent?.location ? `· ${talent.location}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <MatchScore value={a.match_score} size="sm" />
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${statusTone(a.status)}`}
                      >
                        {a.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {talent?.bio && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{talent.bio}</p>
                  )}

                  {talent?.skills && talent.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {talent.skills.slice(0, 5).map((s) => (
                        <SkillTag
                          key={s.name}
                          skill={{ name: s.name, level: s.level as never }}
                          tone="muted"
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                    <span>
                      For:{" "}
                      <span className="font-medium text-foreground">
                        {job?.title ?? "Unknown role"}
                      </span>
                      {" · "}
                      {new Date(a.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <ExpandedPanel
                    applicationId={a.id}
                    talentId={a.talent_id}
                    status={a.status}
                    currentUserId={user?.id ?? ""}
                    currentUserName={user?.user_metadata?.display_name ?? "You"}
                    onMove={(s) => moveStatus(a.id, s)}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Expanded Panel ──────────────────────────────────────────────────────────
// Loads votes and notes from the DB when mounted (i.e., when a card is opened).
// The current user casts one vote per application; all votes from team members
// are shown with their name as stored in the DB.

function ExpandedPanel({
  applicationId,
  talentId,
  status,
  currentUserId,
  currentUserName,
  onMove,
}: {
  applicationId: string;
  talentId: string;
  status: ApplicationStatus;
  currentUserId: string;
  currentUserName: string;
  onMove: (status: ApplicationStatus) => void;
}) {
  const [votes, setVotes] = useState<CandidateVote[]>([]);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [draft, setDraft] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [votingAs, setVotingAs] = useState<Vote | null>(null);

  const loadData = useCallback(async () => {
    const [v, n] = await Promise.all([
      fetchApplicationVotes(applicationId),
      fetchApplicationNotes(applicationId),
    ]);
    setVotes(v);
    setNotes(n);
    // Restore current user's existing vote from DB
    const myVote = v.find((x) => x.voter_id === currentUserId);
    setVotingAs(myVote?.vote ?? null);
  }, [applicationId, currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function castVote(vote: Vote) {
    const next = votingAs === vote ? null : vote;
    setVotingAs(next);
    if (next) {
      await upsertVote(applicationId, next, currentUserName);
      setVotes((prev) => {
        const without = prev.filter((v) => v.voter_id !== currentUserId);
        return [...without, { id: "", application_id: applicationId, voter_id: currentUserId, voter_name: currentUserName, vote: next, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
      });
    }
  }

  async function postNote() {
    const text = draft.trim();
    if (!text || !currentUserId) return;
    setPostingNote(true);
    try {
      const note = await addApplicationNote(applicationId, currentUserId, currentUserName, text);
      setNotes((prev) => [...prev, note]);
      setDraft("");
    } finally {
      setPostingNote(false);
    }
  }

  const voteCount = {
    yes: votes.filter((v) => v.vote === "yes").length,
    no: votes.filter((v) => v.vote === "no").length,
    maybe: votes.filter((v) => v.vote === "maybe").length,
  };

  return (
    <div className="border-t border-border bg-paper px-6 py-5 space-y-6">
      {/* Your vote */}
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Your vote
        </div>
        <div className="flex items-center gap-3">
          {(["yes", "maybe", "no"] as const).map((v) => {
            const icons = { yes: "👍", maybe: "🤔", no: "👎" };
            const labels = { yes: "Yes", maybe: "Maybe", no: "No" };
            return (
              <button
                key={v}
                onClick={() => castVote(v)}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  votingAs === v
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-accent"
                }`}
              >
                {icons[v]} {labels[v]}
              </button>
            );
          })}
          {(voteCount.yes + voteCount.no + voteCount.maybe > 0) && (
            <div className="ml-auto hidden items-center gap-1.5 md:flex text-xs text-muted-foreground">
              {voteCount.yes > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">👍 {voteCount.yes}</span>}
              {voteCount.maybe > 0 && <span className="rounded-full bg-warm px-2 py-0.5 font-semibold text-warm-foreground">🤔 {voteCount.maybe}</span>}
              {voteCount.no > 0 && <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">👎 {voteCount.no}</span>}
            </div>
          )}
        </div>
        {votes.filter((v) => v.voter_id !== currentUserId).length > 0 && (
          <div className="mt-3 space-y-1.5">
            {votes
              .filter((v) => v.voter_id !== currentUserId)
              .map((v) => {
                const icons = { yes: "👍", maybe: "🤔", no: "👎" } as const;
                return (
                  <div key={v.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{v.voter_name}</span>
                    <span>{icons[v.vote]}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Notes thread */}
      <div>
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Team notes
        </div>
        {notes.length > 0 && (
          <div className="mb-3 space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{n.author_name}</span>
                  <span>
                    {new Date(n.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <p>{n.body}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !postingNote && postNote()}
            placeholder="Add a note for your team…"
            className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={postNote}
            disabled={postingNote || !draft.trim()}
            className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Link
          to={`/talent/${talentId}` as never}
          className="rounded-md border border-border bg-card px-4 py-2 text-xs hover:bg-accent"
        >
          View profile
        </Link>
        {status !== "interview" && (
          <button
            onClick={() => onMove("interview")}
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Move to interview →
          </button>
        )}
        {status === "interview" && (
          <button
            onClick={() => onMove("offer")}
            className="rounded-md bg-warm px-4 py-2 text-xs font-medium text-warm-foreground hover:opacity-90"
          >
            Extend offer →
          </button>
        )}
        <button
          onClick={() => onMove("rejected")}
          className="ml-auto rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive hover:bg-destructive/10"
        >
          Archive
        </button>
      </div>
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
