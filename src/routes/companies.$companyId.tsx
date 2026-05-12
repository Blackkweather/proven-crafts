import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { fetchProfile, fetchJobs, fetchChallenges } from "@/lib/db";
import {
  MapPin,
  Users,
  Briefcase,
  Trophy,
  ArrowRight,
  Building2,
  ShieldCheck,
  Clock,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/companies/$companyId")({
  loader: async ({ params }) => {
    try {
      const { profile: company } = await fetchProfile(params.companyId);
      const [allJobs, allChallenges] = await Promise.all([fetchJobs(), fetchChallenges()]);
      const companyJobs = allJobs.filter((j) => j.company_id === params.companyId);
      const companyChallenges = allChallenges.filter((c) => c.company_id === params.companyId);
      return { company, jobs: companyJobs, challenges: companyChallenges };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          {
            title: `${loaderData.company.company_name ?? loaderData.company.display_name} — Skill Network`,
          },
          { name: "description", content: loaderData.company.company_about ?? "" },
          {
            property: "og:title",
            content: `${loaderData.company.company_name ?? loaderData.company.display_name} · ${loaderData.company.company_industry ?? ""}`,
          },
          { property: "og:description", content: loaderData.company.company_about ?? "" },
        ]
      : [],
  }),
  component: CompanyProfilePage,
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="font-display text-5xl">Company not found</div>
        <p className="mt-2 text-sm text-muted-foreground">This company isn't on the network yet.</p>
        <Link
          to="/companies"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Browse companies
        </Link>
      </div>
    </div>
  ),
});

function CompanyProfilePage() {
  const { company, jobs: companyJobs, challenges: companyChallenges } = Route.useLoaderData();

  const companyName = company.company_name ?? company.display_name;
  const hasAntiGhosting = company.anti_ghosting_badge;
  const hasTrustData =
    company.trust_score != null ||
    company.response_time_days != null ||
    company.ghosting_rate != null ||
    company.offer_rate != null;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto px-6 pb-24 pt-16 lg:pt-20">
        {/* Header */}
        <header className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex items-start gap-5">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-foreground font-display text-3xl text-background">
                {company.company_initials ?? companyName?.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-4xl leading-tight md:text-5xl">{companyName}</h1>
                  {hasAntiGhosting && (
                    <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <ShieldCheck size={11} />
                      Anti-ghosting
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {company.company_industry && (
                    <span className="flex items-center gap-1">
                      <Building2 size={13} />
                      {company.company_industry}
                    </span>
                  )}
                  {company.company_industry && company.company_size && (
                    <span className="h-1 w-1 rounded-full bg-border" />
                  )}
                  {company.company_size && (
                    <span className="flex items-center gap-1">
                      <Users size={13} />
                      {company.company_size} people
                    </span>
                  )}
                </div>
              </div>
            </div>

            {company.company_about && (
              <p className="mt-8 max-w-2xl text-lg text-foreground/85 leading-relaxed">
                {company.company_about}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-8 flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase size={15} className="text-primary" />
                <span className="font-semibold">{companyJobs.length}</span>
                <span className="text-muted-foreground">
                  open role{companyJobs.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Trophy size={15} className="text-primary" />
                <span className="font-semibold">{companyChallenges.length}</span>
                <span className="text-muted-foreground">
                  active challenge{companyChallenges.length !== 1 ? "s" : ""}
                </span>
              </div>
              {company.response_time_days != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={15} className="text-primary" />
                  <span className="font-semibold">{company.response_time_days}d</span>
                  <span className="text-muted-foreground">avg. response time</span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="space-y-4">
              <div className="surface-paper rounded-2xl p-6 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Interested in {companyName}?
                </div>
                <p className="text-sm text-muted-foreground">
                  Apply to an open role or take on one of their skill challenges to get noticed.
                </p>
                {companyJobs.length > 0 && (
                  <Link
                    to="/app/jobs"
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    View open roles <ArrowRight size={14} />
                  </Link>
                )}
                {companyChallenges.length > 0 && (
                  <Link
                    to="/challenges"
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent"
                  >
                    Take a challenge <Trophy size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Trust score section */}
        {hasTrustData && (
          <section className="mt-16">
            <h2 className="font-display text-2xl">Hiring transparency</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Real metrics from verified hiring activity on Skill Network.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {company.trust_score != null && (
                <TrustCard
                  icon={<ShieldCheck size={18} />}
                  label="Trust score"
                  value={`${company.trust_score}/100`}
                  desc={
                    company.trust_score >= 95
                      ? "Exceptional"
                      : company.trust_score >= 85
                        ? "Strong"
                        : "Good"
                  }
                  highlight={company.trust_score >= 95}
                />
              )}
              {company.response_time_days != null && (
                <TrustCard
                  icon={<Clock size={18} />}
                  label="Response time"
                  value={`${company.response_time_days}d avg`}
                  desc="From application to first contact"
                  highlight={company.response_time_days < 2}
                />
              )}
              {company.ghosting_rate != null && (
                <TrustCard
                  icon={<Zap size={18} />}
                  label="Ghosting rate"
                  value={`${company.ghosting_rate}%`}
                  desc={
                    company.ghosting_rate === 0
                      ? "Zero ghosting ever"
                      : "Of applications go unanswered"
                  }
                  highlight={company.ghosting_rate === 0}
                />
              )}
              {company.offer_rate != null && (
                <TrustCard
                  icon={<Trophy size={18} />}
                  label="Offer rate"
                  value={`${company.offer_rate}%`}
                  desc="Interviews that result in an offer"
                  highlight={(company.offer_rate ?? 0) >= 35}
                />
              )}
            </div>

            {hasAntiGhosting && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Anti-ghosting badge earned.</span> {companyName}{" "}
                  has responded to every application within 7 days for 6+ consecutive months.
                  Companies that ghost lose visibility on Skill Network.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Open roles */}
        {companyJobs.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl">Open roles</h2>
            <div className="mt-6 space-y-3">
              {companyJobs.map((job) => (
                <Link
                  key={job.id}
                  to="/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-soft"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{job.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {job.location}
                      </span>
                      <span>{job.arrangement}</span>
                      <span>{job.comp}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.required_skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight size={16} className="ml-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Active challenges */}
        {companyChallenges.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl">Active challenges</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {companyChallenges.map((c) => {
                const deadlineDays = Math.max(
                  0,
                  Math.ceil(
                    (new Date(c.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                  ),
                );
                return (
                  <Link
                    key={c.id}
                    to="/challenges/$challengeId"
                    params={{ challengeId: c.id }}
                    className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl leading-snug">{c.title}</h3>
                      {c.prize && (
                        <span className="shrink-0 rounded-full bg-warm px-2.5 py-1 text-xs font-semibold text-warm-foreground">
                          {c.prize}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{c.brief}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {c.required_skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{deadlineDays}d left</span>
                      <span>{c.submissions_count} submissions</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {companyJobs.length === 0 && companyChallenges.length === 0 && (
          <div className="mt-16 rounded-2xl border border-dashed border-border p-12 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No open roles or challenges right now.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Check back soon — this company is growing.
            </p>
          </div>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}

function TrustCard({
  icon,
  label,
  value,
  desc,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  desc: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className={highlight ? "text-primary" : "text-muted-foreground"}>{icon}</div>
      <div className="mt-3 font-display text-2xl">{value}</div>
      <div className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
