import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { fetchChallenge, upsertSubmission, type Challenge } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { MatchScore } from "@/components/match-score";
import { getAIChallengeEval, type ChallengeEvalResult } from "@/lib/ai";

export const Route = createFileRoute("/challenges/$challengeId")({
  loader: async ({ params }) => {
    try {
      const challenge = await fetchChallenge(params.challengeId);
      return { challenge };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.challenge.title} — Skill Network` },
          { name: "description", content: loaderData.challenge.brief },
          { property: "og:title", content: loaderData.challenge.title },
          { property: "og:description", content: loaderData.challenge.brief },
        ]
      : [],
  }),
  component: ChallengeDetail,
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="font-display text-5xl">Not found</div>
        <p className="mt-2 text-sm text-muted-foreground">
          This challenge has closed or never existed.
        </p>
        <Link
          to="/challenges"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Browse open challenges
        </Link>
      </div>
    </div>
  ),
});

function matchScore(required: string[], mySkills: string[]): number {
  if (!required.length) return 0;
  const names = mySkills.map((s) => s.toLowerCase());
  const matched = required.filter((r) => names.includes(r.toLowerCase())).length;
  return Math.round((matched / required.length) * 100);
}

function daysLeft(deadlineAt: string): number {
  const ms = new Date(deadlineAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function ChallengeDetail() {
  const { challenge } = Route.useLoaderData();
  const { user } = useAuth();
  const { skills } = useProfile(user?.id);
  const [submitOpen, setSubmitOpen] = useState(false);

  const company = challenge.company;
  const score = matchScore(
    challenge.required_skills,
    skills.map((s) => s.name),
  );
  const deadline = daysLeft(challenge.deadline_at);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto px-6 pb-24 pt-16 lg:pt-20">
        <div className="text-xs">
          <Link to="/challenges" className="text-muted-foreground hover:text-foreground">
            ← All challenges
          </Link>
        </div>

        <header className="mt-6 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background font-display text-sm">
                {company?.company_initials ??
                  company?.display_name?.slice(0, 2).toUpperCase() ??
                  "?"}
              </div>
              <span>
                {company?.company_name ?? company?.display_name} · {company?.company_industry}
              </span>
            </div>
            <h1 className="mt-5 font-display text-4xl leading-tight md:text-5xl">
              {challenge.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{challenge.brief}</p>
          </div>

          <div className="lg:col-span-4">
            <div className="surface-paper rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your match
                </span>
                <MatchScore value={score} />
              </div>
              <dl className="mt-6 space-y-4 text-sm">
                <Row k="Deadline" v={deadline > 0 ? `${deadline} days left` : "Closed"} />
                <Row k="Submissions" v={String(challenge.submissions_count)} />
                {challenge.prize && <Row k="Prize" v={challenge.prize} />}
                <Row k="Format" v="Async submission · public review" />
              </dl>
              <button
                onClick={() => setSubmitOpen(true)}
                disabled={deadline === 0}
                className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {deadline === 0 ? "Challenge closed" : "Start submission"}
              </button>
            </div>
          </div>
        </header>

        <section className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-10">
            <Block title="The brief">
              <p>{challenge.brief}</p>
              <p>
                We care more about decision-making than polish. Walk us through trade-offs, what you
                cut, and why. Bring a working artifact — a repo, a Figma file, a recorded demo.
              </p>
            </Block>
            <Block title="What to submit">
              <ul className="ml-5 list-disc space-y-2">
                <li>A working artifact (link, repo, or recorded demo)</li>
                <li>A short write-up (≤500 words) on your approach</li>
                <li>Optional: a 2-minute Loom walking through the work</li>
              </ul>
            </Block>
            <Block title="Required skills">
              <div className="flex flex-wrap gap-2">
                {challenge.required_skills.map((s) => {
                  const matched = skills.some((sk) => sk.name.toLowerCase() === s.toLowerCase());
                  return (
                    <span
                      key={s}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        matched
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-card"
                      }`}
                    >
                      {matched ? "✓ " : ""}
                      {s}
                    </span>
                  );
                })}
              </div>
            </Block>
          </div>

          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                About {company?.company_name ?? company?.display_name}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {company?.company_about ?? company?.bio ?? ""}
              </p>
            </div>
          </aside>
        </section>
      </article>

      <SiteFooter />
      {submitOpen && user && (
        <SubmitDialog
          challenge={challenge}
          talentId={user.id}
          onClose={() => setSubmitOpen(false)}
        />
      )}
    </div>
  );
}

function SubmitDialog({
  challenge,
  talentId,
  onClose,
}: {
  challenge: Challenge;
  talentId: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"form" | "evaluating" | "done">("form");
  const [url, setUrl] = useState("");
  const [writeup, setWriteup] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eval_, setEval] = useState<ChallengeEvalResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await upsertSubmission({
        challenge_id: challenge.id,
        talent_id: talentId,
        status: "submitted",
        work_url: url,
        writeup,
      });
      setStep("evaluating");
      try {
        const result = await getAIChallengeEval(challenge, { writeup, work_url: url });
        setEval(result);
      } catch {
        // AI eval failed but submission succeeded — still show done
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const verdictColor: Record<string, string> = {
    shortlist: "bg-primary/10 text-primary",
    consider: "bg-warm text-warm-foreground",
    pass: "bg-muted text-muted-foreground",
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={step === "form" ? onClose : undefined}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-background shadow-elevated max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "evaluating" && (
          <div className="p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h2 className="mt-5 font-display text-xl">Submitted! AI is evaluating…</h2>
            <p className="mt-2 text-sm text-muted-foreground">Gemini is reviewing your submission. Takes a few seconds.</p>
          </div>
        )}

        {step === "done" && (
          <div className="p-8">
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary text-3xl">✓</div>
              <h2 className="mt-4 font-display text-2xl">Submission received.</h2>
              <p className="mt-1 text-sm text-muted-foreground">Reviewers typically respond within 5 business days.</p>
            </div>

            {eval_ && (
              <div className="mt-8 space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Score</div>
                    <div className="mt-1 font-display text-4xl">{eval_.score}<span className="text-lg text-muted-foreground">/100</span></div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${verdictColor[eval_.verdict] ?? ""}`}>
                    {eval_.verdict}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">{eval_.summary}</p>

                {eval_.strengths.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Strengths</div>
                    <ul className="space-y-1">
                      {eval_.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm"><span className="text-primary">✓</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {eval_.improvements.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">To improve</div>
                    <ul className="space-y-1">
                      {eval_.improvements.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm"><span className="text-muted-foreground">→</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(eval_.criteria).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border bg-paper p-3 text-center">
                      <div className="font-display text-xl">{v}</div>
                      <div className="mt-0.5 text-[10px] capitalize text-muted-foreground">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-foreground px-5 py-2.5 text-sm text-background hover:bg-foreground/90"
            >
              Back to challenge
            </button>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Submit your work</div>
              <h2 className="mt-1 font-display text-2xl">{challenge.title}</h2>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Link to your work *</label>
              <input
                required
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/you/project"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Repo, Figma file, deployed demo, or recorded walkthrough.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Your approach *</label>
              <textarea
                required
                rows={6}
                value={writeup}
                onChange={(e) => setWriteup(e.target.value)}
                placeholder="Walk us through your decisions, what you cut, and what you'd do differently with more time. ≤500 words."
                className={`${inputCls} resize-none`}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">{writeup.split(/\s+/).filter(Boolean).length} / 500 words</p>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              ✦ After submission, Gemini AI will instantly score and review your work.
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 border-t border-border pt-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit & get AI feedback →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-none last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}
