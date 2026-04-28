import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { jobs, getCompany, currentTalent, matchScore, candidates } from "@/lib/mock-data";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/jobs/$jobId")({
  loader: ({ params }) => {
    const job = jobs.find((j) => j.id === params.jobId);
    if (!job) throw notFound();
    return { job };
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
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="font-display text-5xl">Role closed</div>
        <p className="mt-2 text-sm text-muted-foreground">This role has been filled or removed.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Back home
        </Link>
      </div>
    </div>
  ),
});

function JobDetail() {
  const { job } = Route.useLoaderData();
  const company = getCompany(job.companyId);
  const score = matchScore(job.requiredSkills, currentTalent.skills);
  const peers = candidates.filter((c) => c.id !== currentTalent.id).slice(0, 3);

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
                {company.initials}
              </div>
              <div>
                <Link to="/companies" className="text-sm font-medium hover:underline">
                  {company.name}
                </Link>
                <div className="text-xs text-muted-foreground">{company.industry} · {company.size}</div>
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
              <button className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
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
                {job.requiredSkills.map((s) => (
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
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">About {company.name}</div>
              <p className="mt-3 text-sm leading-relaxed">{company.about}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Also applied</div>
              <ul className="mt-5 space-y-4">
                {peers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-warm text-warm-foreground font-display text-sm">
                      {t.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{t.headline}</div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {matchScore(job.requiredSkills, t.skills)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </article>

      <SiteFooter />
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
