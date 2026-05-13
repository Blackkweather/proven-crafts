import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useJobs, useMySubmissions, useProfile } from "@/lib/hooks";
import { applyToJob } from "@/lib/db";
import { MatchScore } from "@/components/match-score";
import { getAIJobRecommendations, type JobRecommendation } from "@/lib/ai";

export const Route = createFileRoute("/app/jobs")({
  component: JobsPage,
});

function staticMatchScore(required: string[], mySkills: string[]): number {
  if (!required.length) return 0;
  const names = mySkills.map((s) => s.toLowerCase());
  const matched = required.filter((r) => names.includes(r.toLowerCase())).length;
  return Math.round((matched / required.length) * 100);
}

function JobsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const { jobs, loading } = useJobs(query);
  const { profile, skills } = useProfile(user?.id);
  const [aiScores, setAiScores] = useState<Record<string, JobRecommendation>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (!jobs.length || !skills.length || ranOnce.current) return;
    ranOnce.current = true;
    setAiLoading(true);
    getAIJobRecommendations({ skills, headline: profile?.headline ?? null, location: profile?.location ?? "" }, jobs)
      .then((ranked) => {
        const map: Record<string, JobRecommendation> = {};
        ranked.forEach((r) => { map[r.job_id] = r; });
        setAiScores(map);
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [jobs, skills, profile]);

  const mySkillNames = skills.map((s) => s.name);

  const sorted = [...jobs]
    .map((j) => {
      const ai = aiScores[j.id];
      return { ...j, score: ai ? ai.score : staticMatchScore(j.required_skills, mySkillNames), aiReason: ai?.reason ?? null };
    })
    .sort((a, b) => b.score - a.score);

  const applyTarget = sorted.find((j) => j.id === applyJobId);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sorted.length} roles{aiLoading ? " · AI ranking…" : Object.keys(aiScores).length ? " · AI-ranked" : " · sorted by skill match"}.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by skill or title…"
          className="w-72 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {sorted.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="font-display text-lg">No roles found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or check back later for new openings.</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {sorted.map((j) => {
          const co = j.company;
          return (
            <article
              key={j.id}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft"
            >
              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="grid h-6 w-6 place-items-center rounded bg-foreground text-background font-display text-[10px]">
                      {co?.company_initials ?? co?.display_name?.slice(0, 2).toUpperCase() ?? "?"}
                    </div>
                    <span className="font-medium text-foreground">
                      {co?.company_name ?? co?.display_name}
                    </span>
                    <span>·</span>
                    <span>{co?.company_industry}</span>
                    {co?.anti_ghosting_badge && (
                      <>
                        <span>·</span>
                        <span className="text-primary">⚡ Fast responder</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-xl">{j.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{j.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {j.required_skills.map((s) => {
                      const matched = mySkillNames.some((n) => n.toLowerCase() === s.toLowerCase());
                      return (
                        <span
                          key={s}
                          className={
                            "rounded-full border px-2 py-0.5 text-[11px] " +
                            (matched
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border bg-paper text-muted-foreground")
                          }
                        >
                          {s}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{j.location}</span>
                    <span>·</span>
                    <span>{j.arrangement}</span>
                    <span>·</span>
                    <span className="font-semibold text-foreground">{j.comp}</span>
                    <span>·</span>
                    <span>{j.applicants} applied</span>
                    {co?.response_time_days && (
                      <>
                        <span>·</span>
                        <span>Responds in {co.response_time_days}d avg</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <MatchScore value={j.score} />
                    {j.aiReason && (
                      <span className="text-[10px] text-muted-foreground max-w-[160px] text-right leading-snug">
                        ✦ {j.aiReason}
                      </span>
                    )}
                    {aiLoading && !j.aiReason && (
                      <span className="text-[10px] text-muted-foreground animate-pulse">AI scoring…</span>
                    )}
                  </div>
                  <button
                    onClick={() => setApplyJobId(j.id)}
                    className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {applyTarget && user && (
        <ApplyModal
          job={applyTarget}
          talentId={user.id}
          score={applyTarget.score}
          mySkillNames={mySkillNames}
          onClose={() => setApplyJobId(null)}
        />
      )}
    </div>
  );
}

function ApplyModal({
  job,
  talentId,
  score,
  mySkillNames,
  onClose,
}: {
  job: {
    id: string;
    title: string;
    required_skills: string[];
    company?: {
      company_name?: string | null;
      display_name: string;
      response_time_days?: number | null;
    };
  };
  talentId: string;
  score: number;
  mySkillNames: string[];
  onClose: () => void;
}) {
  const { submissions } = useMySubmissions(talentId);
  const [step, setStep] = useState<"choose" | "message" | "done">("choose");
  const [useSubmissionId, setUseSubmissionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coName = job.company?.company_name ?? job.company?.display_name ?? "the company";
  const responseTime = job.company?.response_time_days;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await applyToJob({
        job_id: job.id,
        talent_id: talentId,
        message: message || undefined,
        challenge_submission_id: useSubmissionId ?? undefined,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-background shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "done" ? (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary text-3xl">
              ✓
            </div>
            <h2 className="mt-5 font-display text-2xl">Application sent.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {coName} typically responds within{" "}
              {responseTime ? `${responseTime} days` : "a few days"}. You'll get a notification.
            </p>
            {useSubmissionId && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                Your challenge submission was attached — you're near the top of their queue.
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-foreground px-5 py-2.5 text-sm text-background hover:bg-foreground/90"
            >
              Back to jobs
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Apply to {coName}
            </div>
            <h2 className="mt-2 font-display text-2xl">{job.title}</h2>

            <div className="mt-5 flex gap-2">
              {(["choose", "message"] as const).map((s, i) => (
                <div
                  key={s}
                  className={`flex items-center gap-1.5 text-xs ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${step === s ? "bg-foreground text-background" : "border border-border"}`}
                  >
                    {i + 1}
                  </span>
                  {s === "choose" ? "Attach challenge" : "Add message"}
                  {i === 0 && <span className="text-muted-foreground/40 mx-1">→</span>}
                </div>
              ))}
            </div>

            {step === "choose" && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Attach a past challenge submission to supercharge your application.
                </p>

                {/* Skill match summary */}
                <div className="rounded-xl border border-border bg-paper p-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Your skill match — {score}%
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills.map((s) => {
                      const matched = mySkillNames.some((n) => n.toLowerCase() === s.toLowerCase());
                      return (
                        <span
                          key={s}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            matched
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {matched ? "✓ " : ""}
                          {s}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {submissions.filter((s) => s.status !== "draft").length > 0 ? (
                  <div className="space-y-2">
                    {submissions
                      .filter((s) => s.status !== "draft")
                      .map((s) => {
                        const selected = useSubmissionId === s.id;
                        return (
                          <label
                            key={s.id}
                            className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-foreground/20"
                            }`}
                          >
                            <input
                              type="radio"
                              name="challenge"
                              checked={selected}
                              onChange={() => setUseSubmissionId(selected ? null : s.id)}
                              className="accent-primary"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm">
                                {(s as { challenge?: { title?: string } }).challenge?.title ??
                                  "Challenge submission"}
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {s.status} · {s.match_score}% match
                              </div>
                            </div>
                            {s.status === "shortlisted" && (
                              <span className="shrink-0 rounded-full border border-warm/40 bg-warm px-2 py-0.5 text-[10px] font-semibold text-warm-foreground">
                                Shortlisted
                              </span>
                            )}
                          </label>
                        );
                      })}
                    <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-border p-4 text-muted-foreground hover:border-foreground/20">
                      <input
                        type="radio"
                        name="challenge"
                        checked={useSubmissionId === null}
                        onChange={() => setUseSubmissionId(null)}
                        className="accent-primary"
                      />
                      <span className="text-sm">Apply with profile only</span>
                    </label>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-paper p-6 text-center">
                    <p className="text-sm text-muted-foreground">No challenge submissions yet.</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep("message")}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Continue →
                </button>
              </div>
            )}

            {step === "message" && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  A short note is optional but increases reply rate by 40%.
                </p>
                {useSubmissionId && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                    ⚡ Challenge attached — shown alongside your profile.
                  </div>
                )}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={`Hi ${coName} team — I'm applying because…`}
                  className="w-full resize-none rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Send application"}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
