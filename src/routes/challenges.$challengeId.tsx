import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { challenges, getCompany, candidates, matchScore, currentTalent } from "@/lib/mock-data";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/challenges/$challengeId")({
  loader: ({ params }) => {
    const challenge = challenges.find((c) => c.id === params.challengeId);
    if (!challenge) throw notFound();
    return { challenge };
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
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="font-display text-5xl">Not found</div>
        <p className="mt-2 text-sm text-muted-foreground">This challenge has closed or never existed.</p>
        <Link to="/challenges" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Browse open challenges
        </Link>
      </div>
    </div>
  ),
});

function ChallengeDetail() {
  const { challenge } = Route.useLoaderData();
  const company = getCompany(challenge.companyId);
  const score = matchScore(challenge.requiredSkills, currentTalent.skills);
  const submitters = candidates.slice(1, 4);

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
                {company.initials}
              </div>
              <span>{company.name} · {company.industry}</span>
            </div>
            <h1 className="mt-5 font-display text-4xl leading-tight md:text-5xl">{challenge.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{challenge.brief}</p>
          </div>
          <div className="lg:col-span-4">
            <div className="surface-paper rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your match</span>
                <MatchScore value={score} />
              </div>
              <dl className="mt-6 space-y-4 text-sm">
                <Row k="Deadline" v={`${challenge.deadlineDays} days left`} />
                <Row k="Submissions" v={String(challenge.submissions)} />
                {challenge.prize && <Row k="Prize" v={challenge.prize} />}
                <Row k="Format" v="Async submission · public review" />
              </dl>
              <button className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Start submission
              </button>
            </div>
          </div>
        </header>

        <section className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-10">
            <Block title="The brief">
              <p>{challenge.brief}</p>
              <p>
                We care more about decision-making than polish. Walk us through trade-offs, what you cut, and why. Bring a working artifact — a repo, a Figma file, a recorded demo.
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
                {challenge.requiredSkills.map((s) => (
                  <span key={s} className="rounded-full border border-border bg-card px-3 py-1 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            </Block>
          </div>

          <aside className="lg:col-span-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recently submitted</div>
              <ul className="mt-5 space-y-4">
                {submitters.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-warm text-warm-foreground font-display text-sm">
                      {t.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{t.headline}</div>
                    </div>
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
