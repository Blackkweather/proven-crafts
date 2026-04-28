import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";
import { currentTalent, jobs, challenges, getCompany } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const featuredJob = jobs[0];
  const featuredCompany = getCompany(featuredJob.companyId);
  const challenge = challenges[0];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-warm/40 blur-3xl" />
        </div>

        <div className="container mx-auto grid gap-16 px-6 pb-24 pt-20 lg:grid-cols-12 lg:gap-10 lg:pt-28">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              AI-powered matching · for talent & companies
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-balance md:text-6xl lg:text-7xl">
              Hiring, rebuilt around proven skills.
              <br />
              <span className="italic text-muted-foreground">Powered by AI.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
              Skill Network uses AI to match talent and companies on real work — not keywords. Candidates showcase shipped projects; companies post focused challenges; our models surface the right people in days, not months.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
              >
                I'm talent — get matched
              </Link>
              <Link
                to="/companies"
                className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                I'm hiring — find talent →
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-8 border-t border-border pt-8 max-w-md">
              <Stat n="12.4k" l="Verified talent" />
              <Stat n="380+" l="Active challenges" />
              <Stat n="9.1d" l="Avg. time-to-hire" />
            </div>
          </div>

          {/* Candidate card */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-warm/60 via-transparent to-primary/10 blur-2xl" />
              <article className="surface-paper rounded-2xl shadow-elevated">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Candidate · live preview
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">#0429</span>
                </div>

                <div className="px-6 pb-6 pt-5">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">
                        {currentTalent.initials}
                      </div>
                      <div>
                        <div className="font-display text-xl">{currentTalent.name}</div>
                        <div className="text-xs text-muted-foreground">{currentTalent.headline}</div>
                      </div>
                    </div>
                    <MatchScore value={94} />
                  </div>

                  <p className="mt-5 text-sm text-foreground/80 leading-relaxed">
                    {currentTalent.bio}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {currentTalent.skills.slice(0, 5).map((s) => (
                      <SkillTag key={s.name} skill={s} tone={s.level === "expert" ? "primary" : "default"} />
                    ))}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <MiniStat label="Shipped projects" value="18" />
                    <MiniStat label="Challenges won" value="3" />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="border-y border-border bg-paper">
        <div className="container mx-auto px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                How it works
              </div>
              <h2 className="mt-3 font-display text-4xl leading-tight">
                A different shape for hiring.
              </h2>
              <p className="mt-4 text-muted-foreground">
                We removed the parts that don't predict success — and built around the parts that do.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:col-span-8 lg:grid-cols-3">
              <Step n="01" t="Show real work" b="Build a profile around shipped projects, writing, and submissions — not bullet points." />
              <Step n="02" t="Take a challenge" b="Companies post focused, paid-or-fast-track challenges. You submit; they evaluate output." />
              <Step n="03" t="Match on signal" b="A transparent match score from skills, evidence, and challenge outcomes. No black boxes." />
            </div>
          </div>
        </div>
      </section>

      {/* DUAL PREVIEW */}
      <section className="container mx-auto grid gap-6 px-6 py-24 lg:grid-cols-2">
        {/* Job card */}
        <article className="surface-paper rounded-2xl p-6 transition-all hover:shadow-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-foreground text-background font-display text-sm">
                {featuredCompany.initials}
              </div>
              <div>
                <div className="text-sm font-medium">{featuredCompany.name}</div>
                <div className="text-xs text-muted-foreground">{featuredCompany.industry}</div>
              </div>
            </div>
            <span className="rounded-full bg-warm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-warm-foreground">
              {featuredJob.arrangement}
            </span>
          </div>
          <h3 className="mt-5 font-display text-2xl leading-snug">{featuredJob.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{featuredJob.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {featuredJob.requiredSkills.map((s) => (
              <SkillTag key={s} skill={{ name: s, level: "advanced" }} tone="muted" />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>{featuredJob.location} · {featuredJob.comp}</span>
            <span>{featuredJob.applicants} applied</span>
          </div>
        </article>

        {/* Challenge card */}
        <article className="rounded-2xl border border-border bg-foreground p-6 text-background transition-all hover:shadow-elevated">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-background/60">
              Open challenge · {challenge.deadlineDays} days left
            </span>
            <span className="font-mono text-xs text-background/60">{challenge.submissions} submissions</span>
          </div>
          <h3 className="mt-5 font-display text-2xl leading-snug">{challenge.title}</h3>
          <p className="mt-2 text-sm text-background/70">{challenge.brief}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {challenge.requiredSkills.map((s) => (
              <span key={s} className="rounded-full border border-background/20 bg-background/10 px-2.5 py-1 text-xs">
                {s}
              </span>
            ))}
          </div>
          {challenge.prize && (
            <div className="mt-6 flex items-center justify-between border-t border-background/15 pt-4 text-xs">
              <span className="text-background/60">Prize</span>
              <span className="font-medium">{challenge.prize}</span>
            </div>
          )}
        </article>
      </section>

      {/* CLOSING CTA */}
      <section className="container mx-auto px-6 pb-28">
        <div className="surface-paper relative overflow-hidden rounded-3xl p-12 text-center md:p-20">
          <h2 className="mx-auto max-w-3xl font-display text-4xl leading-tight md:text-5xl">
            The best work doesn't fit on a resume.
            <br />
            <span className="italic text-muted-foreground">Show it instead.</span>
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/signup"
              className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create your profile
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-3xl">{n}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-lg">{value}</div>
    </div>
  );
}

function Step({ n, t, b }: { n: string; t: string; b: string }) {
  return (
    <div className="bg-background p-8">
      <div className="font-mono text-xs text-muted-foreground">{n}</div>
      <div className="mt-3 font-display text-xl">{t}</div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b}</p>
    </div>
  );
}
