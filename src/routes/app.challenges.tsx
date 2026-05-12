import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProfile, useChallenges } from "@/lib/hooks";
import { getAIMatchScore } from "@/lib/ai";
import { useState } from "react";

export const Route = createFileRoute("/app/challenges")({
  component: ChallengesPage,
});

function calcMatch(required: string[], userSkills: { name: string }[]): number {
  if (!required || required.length === 0) return 0;
  const userSkillNames = userSkills.map((s) => s.name.toLowerCase());
  const matched = required.filter((r) => userSkillNames.includes(r.toLowerCase())).length;
  return Math.round((matched / required.length) * 100);
}

function daysLeft(deadline_at: string): number {
  return Math.max(0, Math.ceil((new Date(deadline_at).getTime() - Date.now()) / 86400000));
}

function ChallengesPage() {
  const { user } = useAuth();
  const { skills, loading: profileLoading } = useProfile(user?.id);
  const { challenges, loading: challengesLoading } = useChallenges();
  const navigate = useNavigate();

  const userSkills = skills ?? [];

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Focused briefs. Real evaluation. Most take a weekend.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {challengesLoading || profileLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ))
        ) : !challenges || challenges.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-3">
            No challenges available right now.
          </p>
        ) : (
          challenges.map((c) => {
            const companyName = c.company?.company_name ?? c.company?.display_name ?? "Company";
            const score = calcMatch(c.required_skills ?? [], userSkills);
            const days = c.deadline_at ? daysLeft(c.deadline_at) : 0;
            return (
              <article
                key={c.id}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft"
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <span>{companyName}</span>
                  <span className={days <= 7 ? "text-destructive" : ""}>{days}d left</span>
                </div>
                <h3 className="mt-3 font-display text-xl leading-snug">{c.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{c.brief}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(c.required_skills ?? []).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.submissions_count ?? 0} entries · {score}% match
                  </span>
                  <button
                    onClick={() =>
                      navigate({ to: "/challenges/$challengeId", params: { challengeId: c.id } })
                    }
                    className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                  >
                    Submit →
                  </button>
                </div>
                {c.prize && (
                  <div className="mt-3 text-[11px] text-warm-foreground">🏆 {c.prize}</div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
