import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { candidates } from "@/lib/mock-data";
import { SkillTag } from "@/components/skill-tag";

export const Route = createFileRoute("/talent/$talentId")({
  loader: ({ params }) => {
    const talent = candidates.find((t) => t.id === params.talentId);
    if (!talent) throw notFound();
    return { talent };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.talent.name} — Skill Network` },
          { name: "description", content: loaderData.talent.bio },
          { property: "og:title", content: `${loaderData.talent.name} · ${loaderData.talent.headline}` },
          { property: "og:description", content: loaderData.talent.bio },
        ]
      : [],
  }),
  component: TalentProfilePage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="font-display text-5xl">Profile unavailable</div>
        <p className="mt-2 text-sm text-muted-foreground">This person isn't on the network.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Back home
        </Link>
      </div>
    </div>
  ),
});

const availabilityMeta: Record<string, { label: string; tone: string }> = {
  open: { label: "Open to work", tone: "bg-primary text-primary-foreground" },
  exploring: { label: "Exploring", tone: "bg-warm text-warm-foreground" },
  booked: { label: "Currently booked", tone: "bg-muted text-muted-foreground" },
};

function TalentProfilePage() {
  const { talent } = Route.useLoaderData();
  const a = availabilityMeta[talent.availability];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto px-6 pb-24 pt-16 lg:pt-20">
        <header className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex items-start gap-5">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary text-primary-foreground font-display text-3xl">
                {talent.initials}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-4xl leading-tight md:text-5xl">{talent.name}</h1>
                <p className="mt-2 text-lg text-muted-foreground">{talent.headline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-widest ${a.tone}`}>
                    {a.label}
                  </span>
                  <span className="text-muted-foreground">· {talent.location}</span>
                  <span className="text-muted-foreground">· {talent.completeness}% complete</span>
                </div>
              </div>
            </div>

            <p className="mt-8 max-w-2xl text-lg text-foreground/85 leading-relaxed">{talent.bio}</p>
          </div>

          <div className="lg:col-span-4">
            <div className="surface-paper rounded-2xl p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Get in touch</div>
              <p className="mt-3 text-sm text-muted-foreground">
                Reach out via the network. Replies typically within 48h.
              </p>
              <button className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Send a message
              </button>
              <button className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent">
                Save to shortlist
              </button>
            </div>
          </div>
        </header>

        <section className="mt-16">
          <h2 className="font-display text-2xl">Skills</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {talent.skills.map((s: { name: string; level: string }) => (
              <SkillTag key={s.name} skill={s} tone={s.level === "expert" ? "primary" : "default"} />
            ))}
          </div>
        </section>

        {talent.portfolio.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl">Selected work</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {talent.portfolio.map((p: { id: string; type: string; year: number | string; title: string; summary: string; tags: string[] }) => (
                <article key={p.id} className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-elevated">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{p.type}</span>
                    <span className="font-mono">{p.year}</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-snug">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.tags.map((t: string) => (
                      <span key={t} className="rounded-full bg-paper px-2.5 py-1 text-xs">{t}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
