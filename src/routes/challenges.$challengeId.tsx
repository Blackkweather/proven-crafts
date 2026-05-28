// =============================================================================
// CHALLENGE DETAIL PAGE — src/routes/challenges.$challengeId.tsx
// =============================================================================
// Full detail page for a specific skill challenge. Accessible to anyone.
// Shows the challenge brief, required skills (with match highlighting for
// logged-in talent), submission count, deadline, and optional prize.
//
// Clicking "Start submission" opens the SubmitDialog overlay. The dialog
// walks the user through a 3-step flow:
//   1. form  — paste a work URL and write a 500-word approach description
//   2. evaluating — Gemini AI reviews the submission (a few seconds)
//   3. done  — shows the AI score, verdict, strengths, and improvement tips
//
// DATA FLOW: Route loader fetches `fetchChallenge(challengeId)` from Supabase.
//            On submit: `upsertSubmission()` saves the submission to the DB,
//            then `getAIChallengeEval()` calls the Gemini API for instant
//            feedback. The AI eval is best-effort — if it fails the submission
//            still succeeds and the user sees the done state without AI data.
// KEYWORDS: AUTH, DATABASE, API, STATE, NAVIGATION
// =============================================================================

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { fetchChallenge, upsertSubmission, type Challenge } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { MatchScore } from "@/components/match-score";
import { getAIChallengeEval, type ChallengeEvalResult } from "@/lib/ai";
import { uploadSubmissionFile } from "@/lib/storage";
import { calcMatch, daysLeft } from "@/lib/utils";
import { Paperclip, X } from "lucide-react";

// NAVIGATION: Dynamic route — "/challenges/:challengeId" with loader and SEO head.
export const Route = createFileRoute("/challenges/$challengeId")({
  // DATABASE: Load the full challenge record (with joined company profile) from Supabase.
  loader: async ({ params }) => {
    try {
      const challenge = await fetchChallenge(params.challengeId);
      return { challenge };
    } catch {
      // Show the not-found UI if the challenge ID doesn't exist.
      throw notFound();
    }
  },
  // SEO: Set page title and Open Graph tags from the loaded challenge data.
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
  // Generic error boundary.
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  // Shown when the loader throws notFound() — challenge is closed or missing.
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


// Returns how many days remain before the deadline. Returns 0 if past due.

function ChallengeDetail() {
  // DATABASE: Pre-loaded challenge data from the route loader.
  const { challenge } = Route.useLoaderData();

  // AUTH: Current user — needed to render the submit button and pass talentId to the dialog.
  const { user } = useAuth();

  // DATABASE: Load the current user's skills for match score calculation.
  const { skills } = useProfile(user?.id);

  // STATE: Controls whether the SubmitDialog overlay is visible.
  const [submitOpen, setSubmitOpen] = useState(false);

  const company = challenge.company;

  const score = calcMatch(challenge.required_skills, skills);

  // Days until the challenge deadline (0 means closed).
  const deadline = daysLeft(challenge.deadline_at);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto px-6 pb-24 pt-16 lg:pt-20">
        {/* NAVIGATION: Back to the challenges list */}
        <div className="text-xs">
          <Link to="/challenges" className="text-muted-foreground hover:text-foreground">
            ← All challenges
          </Link>
        </div>

        <header className="mt-6 grid gap-10 lg:grid-cols-12">
          {/* Left: company identity + challenge title + brief */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              {/* Company avatar: initials badge */}
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

          {/* Right: match score + key details + submit button */}
          <div className="lg:col-span-4">
            <div className="surface-paper rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your match
                </span>
                {/* MatchScore renders a circular percentage indicator */}
                <MatchScore value={score} />
              </div>
              <dl className="mt-6 space-y-4 text-sm">
                <Row k="Deadline" v={deadline > 0 ? `${deadline} days left` : "Closed"} />
                <Row k="Submissions" v={String(challenge.submissions_count)} />
                {challenge.prize && <Row k="Prize" v={challenge.prize} />}
                <Row k="Format" v="Async submission · public review" />
              </dl>
              {/* STATE: Opens SubmitDialog; disabled once the deadline has passed */}
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

        {/* Body: brief, what to submit, required skills, company about */}
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
            {/* DATABASE: Required skills — highlight matched ones for logged-in talent */}
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

          {/* Company about sidebar */}
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

      {/* SubmitDialog overlay — rendered when submitOpen is true */}
      {/* AUTH: Only rendered if user is logged in */}
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

// ─── SubmitDialog ─────────────────────────────────────────────────────────────
// Full-screen overlay for submitting challenge work. Three internal states:
// "form" → "evaluating" (spinner) → "done" (AI results + success message).
function SubmitDialog({
  challenge,
  talentId,
  onClose,
}: {
  challenge: Challenge;
  talentId: string;
  onClose: () => void;
}) {
  // STATE: Which step of the submission flow we're on.
  // "form" = user filling in details, "evaluating" = AI running, "done" = finished.
  const [step, setStep] = useState<"form" | "evaluating" | "done">("form");

  const [url, setUrl] = useState("");
  const [writeup, setWriteup] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eval_, setEval] = useState<ChallengeEvalResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    const oversized: string[] = [];
    for (const f of Array.from(incoming)) {
      if (next.length >= 5) break;
      if (f.size > MAX_FILE_SIZE) { oversized.push(f.name); continue; }
      if (!next.find((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    if (oversized.length > 0) setError(`File(s) too large (max 25 MB): ${oversized.join(", ")}`);
    setFiles(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Upload any attached files first
      let fileUrls: string[] = [];
      if (files.length > 0) {
        fileUrls = await Promise.all(
          files.map((f) => uploadSubmissionFile(talentId, challenge.id, f)),
        );
      }

      // DATABASE: Persist the submission record in Supabase.
      await upsertSubmission({
        challenge_id: challenge.id,
        talent_id: talentId,
        status: "submitted",
        work_url: url || undefined,
        writeup,
        file_urls: fileUrls,
      });

      // Show the loading spinner while AI evaluates.
      setStep("evaluating");

      try {
        // API: Call Gemini to evaluate the submission. This is best-effort —
        // if the AI call fails the submission is still saved successfully.
        const result = await getAIChallengeEval(challenge, { writeup, work_url: url });
        setEval(result);
      } catch {
        // AI eval failed — silently ignore and proceed to done state.
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Maps AI verdict strings to colour class names for the verdict badge.
  const verdictColor: Record<string, string> = {
    shortlist: "bg-primary/10 text-primary",
    consider: "bg-warm text-warm-foreground",
    pass: "bg-muted text-muted-foreground",
  };

  return (
    // Backdrop — clicking it closes the dialog (only in form state).
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={step === "form" ? onClose : undefined}
    >
      {/* Stop click propagation to prevent the modal from closing when clicking inside */}
      <div
        className="w-full max-w-2xl rounded-2xl bg-background shadow-elevated max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Evaluating step: spinner ── */}
        {step === "evaluating" && (
          <div className="p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <h2 className="mt-5 font-display text-xl">Submitted! AI is evaluating…</h2>
            <p className="mt-2 text-sm text-muted-foreground">Gemini is reviewing your submission. Takes a few seconds.</p>
          </div>
        )}

        {/* ── Done step: success + AI results ── */}
        {step === "done" && (
          <div className="p-8">
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary text-3xl">✓</div>
              <h2 className="mt-4 font-display text-2xl">Submission received.</h2>
              <p className="mt-1 text-sm text-muted-foreground">Reviewers typically respond within 5 business days.</p>
            </div>

            {/* API: Show AI evaluation results only if the eval succeeded */}
            {eval_ && (
              <div className="mt-8 space-y-5">
                {/* Score + verdict badge */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Score</div>
                    <div className="mt-1 font-display text-4xl">{eval_.score}<span className="text-lg text-muted-foreground">/100</span></div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${verdictColor[eval_.verdict] ?? ""}`}>
                    {eval_.verdict}
                  </span>
                </div>

                {/* AI summary paragraph */}
                <p className="text-sm text-muted-foreground">{eval_.summary}</p>

                {/* Strengths list */}
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

                {/* Improvements list */}
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

                {/* Per-criteria score breakdown grid */}
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

        {/* ── Form step: URL + write-up inputs ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Submit your work</div>
              <h2 className="mt-1 font-display text-2xl">{challenge.title}</h2>
            </div>

            {/* Work URL field — optional when files are attached */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Link to your work {files.length === 0 ? "*" : "(optional if attaching files)"}
              </label>
              <input
                required={files.length === 0}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/you/project"
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Repo, Figma file, deployed demo, or recorded walkthrough.</p>
            </div>

            {/* File attachments — up to 5 files, images/PDFs/zip/video */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Attachments <span className="font-normal text-muted-foreground/60">(optional, max 5 files · 25 MB each)</span></label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,application/zip,text/plain"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              {files.length > 0 && (
                <ul className="mb-2 space-y-1.5">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                      <Paperclip size={13} className="shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 rounded p-0.5 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {files.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Paperclip size={14} />
                  Attach files
                </button>
              )}
            </div>

            {/* Approach write-up — required, word count shown live */}
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
              {/* Live word count indicator */}
              <p className="mt-1 text-[11px] text-muted-foreground">{writeup.split(/\s+/).filter(Boolean).length} / 500 words</p>
            </div>

            {/* AI eval notice */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              ✦ After submission, Gemini AI will instantly score and review your work.
            </div>

            {/* VALIDATION: Error shown if the DB call or submission fails */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 border-t border-border pt-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent">
                Cancel
              </button>
              {/* STATE: Disabled while submitting to prevent duplicate submissions */}
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

// Shared CSS class string for all text inputs/textareas in the dialog.
const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

// ─── Row ──────────────────────────────────────────────────────────────────────
// A key-value row in the challenge details card sidebar.
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-none last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

// ─── Block ────────────────────────────────────────────────────────────────────
// Reusable content section with heading and body slot.
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}
