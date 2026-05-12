import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCompanyPipeline } from "@/lib/hooks";
import { updateApplicationStatus, type ApplicationStatus } from "@/lib/db";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/company/candidates")({
  component: Candidates,
});

const tabs = ["all", "new", "reviewing", "interview", "offer"] as const;
type Tab = (typeof tabs)[number];

type LocalVote = "yes" | "no" | "maybe" | null;

function Candidates() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<
    Record<string, Array<{ author: string; text: string; at: string }>>
  >({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [votes, setVotes] = useState<Record<string, Record<string, LocalVote>>>({});

  const { applications, loading, refetch } = useCompanyPipeline(
    user?.id,
    tab === "all" ? undefined : tab,
  );

  function addNote(appId: string) {
    const text = draft[appId]?.trim();
    if (!text) return;
    setNotes((prev) => ({
      ...prev,
      [appId]: [...(prev[appId] ?? []), { author: "You", text, at: "just now" }],
    }));
    setDraft((prev) => ({ ...prev, [appId]: "" }));
  }

  function setVote(appId: string, member: string, vote: LocalVote) {
    setVotes((prev) => ({ ...prev, [appId]: { ...(prev[appId] ?? {}), [member]: vote } }));
  }

  async function moveStatus(appId: string, status: ApplicationStatus) {
    await updateApplicationStatus(appId, status);
    refetch();
  }

  const teamMembers = ["Lena (EM)", "Paulo (Design)", "Felix (Eng)"];

  if (loading) return <div className="text-sm text-muted-foreground">Loading pipeline…</div>;

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
            const candidateNotes = notes[a.id] ?? [];
            const candidateVotes = votes[a.id] ?? {};

            const voteCount = {
              yes: Object.values(candidateVotes).filter((v) => v === "yes").length,
              no: Object.values(candidateVotes).filter((v) => v === "no").length,
              maybe: Object.values(candidateVotes).filter((v) => v === "maybe").length,
            };

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
                      {voteCount.yes + voteCount.no + voteCount.maybe > 0 && (
                        <div className="hidden items-center gap-1.5 md:flex">
                          {voteCount.yes > 0 && (
                            <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              👍 {voteCount.yes}
                            </span>
                          )}
                          {voteCount.maybe > 0 && (
                            <span className="flex items-center gap-0.5 rounded-full bg-warm px-2 py-0.5 text-[10px] font-semibold text-warm-foreground">
                              🤔 {voteCount.maybe}
                            </span>
                          )}
                          {voteCount.no > 0 && (
                            <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                              👎 {voteCount.no}
                            </span>
                          )}
                        </div>
                      )}
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
                    {candidateNotes.length > 0 && (
                      <span>
                        {candidateNotes.length} note{candidateNotes.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-paper px-6 py-5 space-y-6">
                    {/* Team voting */}
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Team votes
                      </div>
                      <div className="space-y-2">
                        {teamMembers.map((member) => {
                          const myVote = candidateVotes[member] ?? null;
                          return (
                            <div
                              key={member}
                              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                            >
                              <span className="text-sm font-medium">{member}</span>
                              <div className="flex gap-1.5">
                                {(["yes", "maybe", "no"] as const).map((v) => {
                                  const icons = { yes: "👍", maybe: "🤔", no: "👎" };
                                  return (
                                    <button
                                      key={v}
                                      onClick={() => setVote(a.id, member, myVote === v ? null : v)}
                                      className={`rounded-md px-2.5 py-1.5 text-sm transition-all ${myVote === v ? "bg-foreground text-background" : "border border-border bg-card hover:bg-accent"}`}
                                    >
                                      {icons[v]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notes thread */}
                    <div>
                      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Team notes
                      </div>
                      {candidateNotes.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {candidateNotes.map((n, i) => (
                            <div
                              key={i}
                              className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
                            >
                              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{n.author}</span>
                                <span>{n.at}</span>
                              </div>
                              <p>{n.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={draft[a.id] ?? ""}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [a.id]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === "Enter" && addNote(a.id)}
                          placeholder="Add a note for your team…"
                          className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                        <button
                          onClick={() => addNote(a.id)}
                          className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background hover:bg-foreground/90"
                        >
                          Post
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                      <Link
                        to={`/talent/${a.talent_id}` as never}
                        className="rounded-md border border-border bg-card px-4 py-2 text-xs hover:bg-accent"
                      >
                        View profile
                      </Link>
                      {a.status !== "interview" && (
                        <button
                          onClick={() => moveStatus(a.id, "interview")}
                          className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          Move to interview →
                        </button>
                      )}
                      {a.status !== "offer" && a.status === "interview" && (
                        <button
                          onClick={() => moveStatus(a.id, "offer")}
                          className="rounded-md bg-warm px-4 py-2 text-xs font-medium text-warm-foreground hover:opacity-90"
                        >
                          Extend offer →
                        </button>
                      )}
                      <button
                        onClick={() => moveStatus(a.id, "rejected")}
                        className="ml-auto rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
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
