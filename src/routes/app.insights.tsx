import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProfile, useMarketRates } from "@/lib/hooks";
import { fetchProfileViewCount, fetchShortlistCount } from "@/lib/db";
import type { MarketRate } from "@/lib/db";

export const Route = createFileRoute("/app/insights")({
  component: InsightsPage,
});

function InsightsPage() {
  const { user } = useAuth();
  const { profile, skills, loading: profileLoading } = useProfile(user?.id);
  const { rates, loading: ratesLoading } = useMarketRates();
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [shortlistCount, setShortlistCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchProfileViewCount(user.id)
      .then(setViewCount)
      .catch(() => setViewCount(null));
    fetchShortlistCount(user.id)
      .then(setShortlistCount)
      .catch(() => setShortlistCount(null));
  }, [user?.id]);

  const loading = profileLoading || ratesLoading;

  const mySkillNames = new Set(skills.map((s) => s.name));
  const myRates = rates.filter((r) => mySkillNames.has(r.skill));
  const otherRates = rates.filter((r) => !mySkillNames.has(r.skill));

  const topSkill = myRates.length > 0 ? [...myRates].sort((a, b) => b.median - a.median)[0] : null;

  return (
    <div className="max-w-4xl space-y-10">
      {/* Profile analytics — static placeholders (no DB analytics yet) */}
      <section>
        <h2 className="font-display text-2xl">Profile signal</h2>
        <p className="mt-1 text-sm text-muted-foreground">How the market sees you · last 30 days</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Profile views"
            value={viewCount !== null ? String(viewCount) : "…"}
            sub="Last 30 days"
            trend="flat"
          />
          <StatCard
            label="Shortlists"
            value={shortlistCount !== null ? String(shortlistCount) : "…"}
            sub="Companies saved you · 30d"
            trend="flat"
          />
          <StatCard label="Search appearances" value="--" sub="Coming soon" trend="flat" />
          <StatCard
            label="Profile strength"
            value={profile ? `${profile.completeness_pct}%` : "…"}
            sub={skills.length > 0 ? `${skills.length} skills` : "Add skills"}
            trend={profile && profile.completeness_pct >= 70 ? "up" : "flat"}
          />
        </div>
      </section>

      {/* Your skill market rates */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl">Market rates for your skills</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Based on verified offers on Skill Network · EU market
            </p>
          </div>
          {topSkill && (
            <div className="hidden text-right text-xs text-muted-foreground md:block">
              Your highest-value skill:{" "}
              <span className="font-semibold text-foreground">{topSkill.skill}</span>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && myRates.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No market rate data found for your skills. Add skills to your profile to see rates.
            </div>
          )}
          {myRates.map((r) => (
            <MarketRateRow key={r.skill + r.location} rate={r} highlight />
          ))}
        </div>
      </section>

      {/* Skills in demand you don't have */}
      <section>
        <h2 className="font-display text-2xl">Skills worth adding</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          High-demand skills on the network that aren't on your profile yet.
        </p>
        <div className="mt-5 space-y-3">
          {!loading && otherRates.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No additional skills data available.
            </div>
          )}
          {otherRates.slice(0, 4).map((r) => (
            <MarketRateRow key={r.skill + r.location} rate={r} highlight={false} />
          ))}
        </div>
      </section>

      {/* Salary positioning */}
      {topSkill && (
        <section>
          <h2 className="font-display text-2xl">Where you stand</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on your verified skills and profile completeness.
          </p>
          <div className="mt-5 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Estimated fair range · {topSkill.location}
                </div>
                <div className="mt-2 font-display text-4xl">
                  €{Math.round(topSkill.p25 / 1000)}k
                  <span className="text-muted-foreground"> – </span>€
                  {Math.round(topSkill.p75 / 1000)}k
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Median for your skill set: €{Math.round(topSkill.median / 1000)}k
                </div>
              </div>
              <div className="hidden text-right md:block">
                <div className="text-xs text-muted-foreground">Market trend</div>
                <div className="mt-1 text-2xl font-display text-primary">↑ +{topSkill.delta}%</div>
                <div className="text-xs text-muted-foreground">vs last year</div>
              </div>
            </div>

            <div className="relative mt-6">
              <div className="h-3 w-full overflow-hidden rounded-full bg-border">
                <div className="flex h-full">
                  <div
                    className="h-full bg-foreground/15 rounded-l-full"
                    style={{ width: "33%" }}
                  />
                  <div className="h-full bg-primary/60" style={{ width: "34%" }} />
                  <div
                    className="h-full bg-foreground/25 rounded-r-full"
                    style={{ width: "33%" }}
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>p25 · €{Math.round(topSkill.p25 / 1000)}k</span>
                <span className="text-primary font-semibold">
                  Median · €{Math.round(topSkill.median / 1000)}k
                </span>
                <span>p75 · €{Math.round(topSkill.p75 / 1000)}k</span>
              </div>
            </div>

            <p className="mt-5 rounded-lg bg-paper border border-border px-4 py-3 text-xs text-muted-foreground">
              All data sourced from real offers made on Skill Network. Verified compensation data
              collected in the last 6 months.
            </p>
          </div>
        </section>
      )}

      {/* Tips */}
      <section>
        <h2 className="font-display text-2xl">Boost your signal</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            {
              title: "Add a video intro",
              desc: "Profiles with a 60-second video get 3.4× more recruiter-initiated contact.",
              cta: "Add video",
              to: "/app/profile",
              urgent: true,
            },
            {
              title: "Submit to a challenge",
              desc: "A shortlisted submission is the highest-signal item on your profile.",
              cta: "Browse challenges",
              to: "/app/challenges",
              urgent: false,
            },
            {
              title: "Verify more skills",
              desc: "Verified skills show evidence. They convert 2× better than self-reported ones.",
              cta: "Add evidence",
              to: "/app/profile",
              urgent: false,
            },
            {
              title: "Enable blind screening",
              desc: "Let your work speak first. Reduces bias and increases shortlist rate.",
              cta: "Enable in settings",
              to: "/app/settings",
              urgent: false,
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className={`rounded-2xl border p-5 ${tip.urgent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="font-medium">{tip.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{tip.desc}</p>
              <Link
                to={tip.to as never}
                className={`mt-4 inline-block rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tip.urgent
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-card hover:bg-accent"
                }`}
              >
                {tip.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  trend: "up" | "flat" | "down";
}) {
  return (
    <div className="surface-paper rounded-2xl p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="font-display text-3xl">{value}</div>
        <span
          className={`text-xs font-semibold ${
            trend === "up"
              ? "text-primary"
              : trend === "down"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function MarketRateRow({ rate, highlight }: { rate: MarketRate; highlight: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        highlight
          ? "border-border bg-card hover:border-foreground/20"
          : "border-dashed border-border bg-paper"
      }`}
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{rate.skill}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                rate.trend === "up"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {rate.trend === "up" ? `↑ +${rate.delta}%` : "→ stable"}
            </span>
            {!highlight && (
              <span className="rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] text-muted-foreground">
                Not on profile
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{rate.location}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-lg">€{Math.round(rate.median / 1000)}k</div>
          <div className="text-[10px] text-muted-foreground">median</div>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${highlight ? "bg-primary" : "bg-foreground/30"}`}
            style={{ width: `${((rate.median - rate.p25) / (rate.p75 - rate.p25)) * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>€{Math.round(rate.p25 / 1000)}k</span>
          <span>€{Math.round(rate.p75 / 1000)}k</span>
        </div>
      </div>
    </div>
  );
}
