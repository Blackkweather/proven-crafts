import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useLeaderboard } from "@/lib/hooks";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Skill Network" },
      {
        name: "description",
        content: "The top performers from recent skill challenges. Real work, publicly ranked.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const badgeMeta = {
  gold: { label: "1st", cls: "bg-yellow-400 text-yellow-900", ring: "ring-yellow-300/60" },
  silver: { label: "2nd", cls: "bg-slate-300 text-slate-800", ring: "ring-slate-200/60" },
  bronze: { label: "3rd", cls: "bg-amber-600 text-amber-100", ring: "ring-amber-500/40" },
};

function getInitials(displayName?: string | null): string {
  if (!displayName) return "?";
  return displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();

  const top3 = entries.filter((e) => e.badge != null);
  const rest = entries.filter((e) => e.badge == null);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="container mx-auto px-6 pb-12 pt-20 lg:pt-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Challenge leaderboard
            </div>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] md:text-6xl">
              The work speaks.
              <br />
              <span className="italic text-muted-foreground">Publicly.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Every challenge submission is reviewed by real engineers. Top performers are ranked,
              highlighted, and visible to every company on the network. No resume needed.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="surface-paper rounded-2xl p-6">
              <div className="grid grid-cols-3 divide-x divide-border text-center">
                <Stat n={loading ? "…" : String(entries.length)} l="Ranked entries" />
                <Stat n={loading ? "…" : String(top3.length)} l="Top finishers" />
                <Stat n={loading ? "…" : String(rest.length)} l="Honourable mentions" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading && (
        <section className="container mx-auto px-6 pb-12">
          <div className="text-sm text-muted-foreground">Loading leaderboard…</div>
        </section>
      )}

      {/* Podium — top 3 */}
      {!loading && top3.length > 0 && (
        <section className="container mx-auto px-6 pb-12">
          <div className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Top performers
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {top3.map((entry) => {
              const bm = badgeMeta[entry.badge!];
              const companyName =
                entry.challenge?.company?.company_name ??
                entry.challenge?.company?.display_name ??
                null;
              return (
                <article
                  key={entry.rank}
                  className={`relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:shadow-elevated ${entry.badge === "gold" ? "border-yellow-300/40 bg-yellow-50/30 dark:bg-yellow-950/10" : "border-border"}`}
                >
                  {/* Badge */}
                  <div
                    className={`absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full ring-2 ${bm.cls} ${bm.ring}`}
                  >
                    <span className="text-[10px] font-black">{bm.label}</span>
                  </div>

                  {/* Talent */}
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">
                      {getInitials(entry.talent?.display_name)}
                    </div>
                    <div>
                      <Link
                        to="/talent/$talentId"
                        params={{ talentId: entry.talent_id }}
                        className="font-display text-xl hover:underline"
                      >
                        {entry.talent?.display_name ?? "Unknown"}
                      </Link>
                      <div className="text-xs text-muted-foreground">{entry.talent?.location}</div>
                    </div>
                  </div>

                  {/* Challenge */}
                  <div className="mt-4 rounded-lg border border-border bg-paper px-3 py-2.5 text-xs text-muted-foreground">
                    {companyName && (
                      <>
                        <span className="font-medium text-foreground">{companyName}</span>
                        {" · "}
                      </>
                    )}
                    {entry.challenge?.title}
                  </div>

                  {/* Score */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${entry.score}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm font-semibold">{entry.score}%</span>
                  </div>

                  {/* Highlight */}
                  <p className="mt-4 text-sm italic text-muted-foreground leading-relaxed">
                    "{entry.highlight}"
                  </p>

                  <div className="mt-5">
                    <Link
                      to="/talent/$talentId"
                      params={{ talentId: entry.talent_id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View full profile →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Rest of rankings */}
      {!loading && rest.length > 0 && (
        <section className="container mx-auto px-6 pb-24">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Honourable mentions
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {rest.map((entry, i) => {
              const companyName =
                entry.challenge?.company?.company_name ??
                entry.challenge?.company?.display_name ??
                null;
              return (
                <div
                  key={entry.rank}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-5 px-6 py-5 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <span className="font-mono text-sm text-muted-foreground w-5 text-center">
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background font-display text-sm">
                        {getInitials(entry.talent?.display_name)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to="/talent/$talentId"
                          params={{ talentId: entry.talent_id }}
                          className="font-medium text-sm hover:underline"
                        >
                          {entry.talent?.display_name ?? "Unknown"}
                        </Link>
                        <div className="text-xs text-muted-foreground truncate">
                          {companyName && `${companyName} · `}
                          {entry.challenge?.title}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground italic line-clamp-1">
                      "{entry.highlight}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border hidden md:block">
                      <div
                        className="h-full rounded-full bg-foreground/60"
                        style={{ width: `${entry.score}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm">{entry.score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container mx-auto px-6 pb-28">
        <div className="surface-paper rounded-3xl p-12 text-center">
          <h2 className="font-display text-4xl">Your next submission could be here.</h2>
          <p className="mt-3 text-muted-foreground">
            Top 5 performers are visible to every company on the network. No application needed.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/challenges"
              className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Browse open challenges
            </Link>
            <Link
              to="/signup"
              className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              Create your profile
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
    <div className="px-2">
      <div className="font-display text-2xl">{n}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );
}
