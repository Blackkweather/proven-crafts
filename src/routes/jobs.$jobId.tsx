import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { fetchJob, applyToJob } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/jobs/$jobId")({
  loader: async ({ params }) => {
    try {
      const job = await fetchJob(params.jobId);
      return { job };
    } catch {
      throw notFound();
    }
  },
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
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
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

function matchScore(required: string[], mySkills: string[]): number {
  if (!required.length) return 0;
  const names = mySkills.map((s) => s.toLowerCase());
  const matched = required.filter((r) => names.includes(r.toLowerCase())).length;
  return Math.round((matched / required.length) * 100);
}

function JobDetail() {
  const { job } = Route.useLoaderData();
  const { user } = useAuth();
  const { skills } = useProfile(user?.id);
  const [applyOpen, setApplyOpen] = useState(false);
  const company = job.company;
  const score = matchScore(
    job.required_skills,
    skills.map((s) => s.name),
  );
  const peers: never[] = [];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto px-6 pb-24 pt-16 lg:pt-20">
        <div className="text-xs">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>

        <header className="mt-6 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3">
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

          <div className="lg:col-span-4">
            <div className="surface-paper rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your match
                </span>
                <MatchScore value={score} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Based on your verified skills and recent submissions.
              </p>
              <button
                onClick={() => setApplyOpen(true)}
                className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Apply with profile
              </button>
              <Link
                to="/app/profile"
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Tailor your submission
              </Link>
            </div>
          </div>
        </header>

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
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const coName = company?.company_name ?? company?.display_name ?? "the company";
  const matchedSkills = job.required_skills.filter((s) =>
    mySkillNames.some((n) => n.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-background shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              try {
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent"
              >
                Cancel
              </button>
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-foreground/85 leading-relaxed">{children}</div>
    </section>
  );
}
