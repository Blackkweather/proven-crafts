// =============================================================================
// JOB DETAIL PAGE — src/routes/jobs.$jobId.tsx
// =============================================================================
// Full detail page for a specific job listing. Accessible to anyone, but the
// "Apply" button is only functional for logged-in talent. The page calculates
// a match score by comparing the job's required skills against the logged-in
// user's skills (loaded from their profile).
//
// Shows: company info, job title, location/arrangement/comp, summary, "what
// you'll do" bullet list, required skills with match highlighting, "how we
// hire" process, and a company about panel.
//
// Clicking "Apply with profile" opens the ApplyModal overlay, which lets the
// user add an optional message and submit their application.
//
// DATA FLOW: Route loader fetches `fetchJob(jobId)` from Supabase before
//            rendering. On the client, `useProfile(user.id)` loads the current
//            user's skills for match score calculation. The apply form calls
//            `applyToJob()` from @/lib/db.
// KEYWORDS: AUTH, DATABASE, STATE, NAVIGATION
// =============================================================================

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { fetchJob, applyToJob } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";
import { calcMatch } from "@/lib/utils";

// NAVIGATION: Dynamic route — "/jobs/:jobId" with a loader and SEO head.
export const Route = createFileRoute("/jobs/$jobId")({
  // DATABASE: Load the full job record (including joined company profile) from Supabase.
  loader: async ({ params }) => {
    try {
      const job = await fetchJob(params.jobId);
      return { job };
    } catch {
      // If the job doesn't exist or has been closed, show the not-found component.
      throw notFound();
    }
  },
  // SEO: Set browser title and Open Graph tags from the job data.
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.job.title} — Skill Network` },
          { name: "description", content: loaderData.job.summary },
          { property: "og:title", content: loaderData.job.title },
          { property: "og:description", content: loaderData.job.summary },
        ]
      : [],
  }),
  component: JobDetail,
  // Generic error boundary.
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  // Shown when the loader throws notFound() — job is closed or doesn't exist.
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="font-display text-5xl">Role closed</div>
        <p className="mt-2 text-sm text-muted-foreground">This role has been filled or removed.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Back home
        </Link>
      </div>
    </div>
  ),
});

function JobDetail() {
  // DATABASE: Get the pre-loaded job data from the route loader.
  const { job } = Route.useLoaderData();

  // AUTH: Get the current user to check if they're logged in.
  const { user } = useAuth();

  // DATABASE: Load the current user's skills to compute a match score.
  // If no user is logged in, skills will be empty and score will be 0.
  const { skills } = useProfile(user?.id);

  // STATE: Controls whether the ApplyModal overlay is visible.
  const [applyOpen, setApplyOpen] = useState(false);

  const company = job.company;

  const score = calcMatch(job.required_skills, skills);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto px-6 pb-24 pt-16 lg:pt-20">
        {/* NAVIGATION: Back link to the home page */}
        <div className="text-xs">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>

        <header className="mt-6 grid gap-10 lg:grid-cols-12">
          {/* Left: company info + job title + meta */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3">
              {/* Company avatar: initials badge */}
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-foreground text-background font-display">
                {company?.company_initials ??
                  company?.display_name?.slice(0, 2).toUpperCase() ??
                  "?"}
              </div>
              <div>
                <span className="text-sm font-medium">
                  {company?.company_name ?? company?.display_name}
                </span>
                <div className="text-xs text-muted-foreground">
                  {company?.company_industry} · {company?.company_size}
                </div>
              </div>
            </div>

            <h1 className="mt-6 font-display text-4xl leading-tight md:text-5xl">{job.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <span>{job.location}</span>
              <span>·</span>
              <span>{job.arrangement}</span>
              <span>·</span>
              <span>{job.comp}</span>
              <span>·</span>
              <span>{job.applicants} applied</span>
            </div>
            <p className="mt-6 text-lg text-muted-foreground">{job.summary}</p>
          </div>

          {/* Right: match score + apply CTA */}
          <div className="lg:col-span-4">
            <div className="surface-paper rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your match
                </span>
                {/* MatchScore renders a circular percentage badge */}
                <MatchScore value={score} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Based on your verified skills and recent submissions.
              </p>
              {/* STATE: Opens the ApplyModal overlay */}
              <button
                onClick={() => setApplyOpen(true)}
                className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Apply with profile
              </button>
              {/* NAVIGATION: Link to the talent's own profile editor */}
              <Link
                to="/app/profile"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Tailor your submission
              </Link>
            </div>
          </div>
        </header>

        {/* Body content: job responsibilities, required skills, hiring process, company about */}
        <section className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-10">
            <Block title="What you'll do">
              <ul className="ml-5 list-disc space-y-2">
                <li>Lead the architecture and direction of a critical product surface.</li>
                <li>Partner closely with design and PM on weekly shipping cycles.</li>
                <li>Set the technical standard for a team of 8 engineers.</li>
                <li>Mentor mid-level engineers through structured pairing.</li>
              </ul>
            </Block>

            {/* DATABASE: Required skills from the job record, rendered as SkillTag pills */}
            <Block title="Required skills">
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((s: string) => (
                  <SkillTag key={s} skill={{ name: s, level: "advanced" }} tone="muted" />
                ))}
              </div>
            </Block>

            <Block title="How we hire">
              <ol className="ml-5 list-decimal space-y-2">
                <li>30-minute conversation with the hiring manager.</li>
                <li>Paid scoped trial — €600 flat for ~4 hours of focused work.</li>
                <li>Team day, async or onsite in Berlin.</li>
                <li>Decision within 5 working days.</li>
              </ol>
            </Block>
          </div>

          {/* Company about sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                About {company?.company_name ?? company?.display_name}
              </div>
              <p className="mt-3 text-sm leading-relaxed">
                {company?.company_about ?? company?.bio}
              </p>
            </div>
          </aside>
        </section>
      </article>

      <SiteFooter />

      {/* ApplyModal: rendered as an overlay when applyOpen is true */}
      {/* AUTH: Only rendered if the user is logged in */}
      {applyOpen && user && (
        <ApplyModal
          job={job}
          company={company}
          talentId={user.id}
          mySkillNames={skills.map((s) => s.name)}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </div>
  );
}

// ─── ApplyModal ───────────────────────────────────────────────────────────────
// Full-screen overlay for submitting a job application.
// Shows matched/unmatched skills and an optional message field.
// Has two views: the application form, and a success confirmation.
function ApplyModal({
  job,
  company,
  talentId,
  mySkillNames,
  onClose,
}: {
  job: { id: string; title: string; required_skills: string[] };
  company?: {
    company_name?: string | null;
    display_name?: string;
    response_time_days?: number | null;
  } | null;
  talentId: string;
  mySkillNames: string[];
  onClose: () => void;
}) {
  // STATE: True after the application has been successfully submitted.
  const [done, setDone] = useState(false);
  // STATE: True while the applyToJob API call is in flight.
  const [submitting, setSubmitting] = useState(false);
  // STATE: Error message shown if the application fails.
  const [error, setError] = useState<string | null>(null);
  // STATE: Optional message the talent can attach to their application.
  const [message, setMessage] = useState("");

  const coName = company?.company_name ?? company?.display_name ?? "the company";

  // Calculate which required skills the user already has (for the match preview).
  const matchedSkills = job.required_skills.filter((s) =>
    mySkillNames.some((n) => n.toLowerCase() === s.toLowerCase()),
  );

  return (
    // Clicking the backdrop (outside the modal) closes it.
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Stop click propagation so clicking inside the modal doesn't close it */}
      <div
        className="w-full max-w-xl rounded-2xl bg-background shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* STATE: Success view — shown after application is submitted */}
        {done ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary text-3xl">
              ✓
            </div>
            <h2 className="mt-5 font-display text-2xl">Application sent.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {coName} typically responds within{" "}
              {company?.response_time_days
                ? `${company.response_time_days} days`
                : "a few business days"}
              .
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-foreground px-5 py-2.5 text-sm text-background hover:bg-foreground/90"
            >
              Back to role
            </button>
          </div>
        ) : (
          // Application form view
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              try {
                // DATABASE: Submit the application to Supabase.
                await applyToJob({
                  job_id: job.id,
                  talent_id: talentId,
                  message: message || undefined,
                });
                setDone(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to apply.");
              } finally {
                setSubmitting(false);
              }
            }}
            className="p-8 space-y-6"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Apply to {coName}
              </div>
              <h2 className="mt-1 font-display text-2xl">{job.title}</h2>
            </div>

            {/* Skill match preview — green for matched, grey for missing */}
            <div className="rounded-xl border border-border bg-paper p-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Your skill match</div>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.map((s) => {
                  const matched = matchedSkills.includes(s);
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
              <p className="mt-2 text-xs text-muted-foreground">
                {matchedSkills.length} of {job.required_skills.length} required skills matched.
              </p>
            </div>

            {/* Optional message field */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Note to hiring team{" "}
                <span className="font-normal opacity-60">(optional — boosts reply rate)</span>
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Hi ${coName} — I'm interested because…`}
                className="w-full resize-none rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            {/* VALIDATION: Error shown if the API call fails */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              {/* STATE: Disabled while submitting to prevent duplicate submissions */}
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send application →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Block ────────────────────────────────────────────────────────────────────
// Reusable section wrapper with a heading and body content slot.
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}
