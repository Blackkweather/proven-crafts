import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { applications, getJob, getTalent } from "@/lib/mock-data";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/company/candidates")({
  component: Candidates,
});

const tabs = ["all", "new", "reviewing", "interview", "offer"] as const;
type Tab = typeof tabs[number];

function Candidates() {
  const [tab, setTab] = useState<Tab>("all");
  const filtered = applications
    .filter((a) => tab === "all" || a.status === tab)
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border bg-paper p-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={"rounded-md px-3 py-1.5 text-xs capitalize transition-colors " + (tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} candidates · ranked by match</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((a) => {
          const t = getTalent(a.talentId);
          const j = getJob(a.jobId);
          return (
            <article key={a.id} className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-display">{t.initials}</div>
                  <div>
                    <div className="font-display text-lg">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.headline} · {t.location}</div>
                  </div>
                </div>
                <MatchScore value={a.matchScore} size="sm" />
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{t.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.skills.slice(0, 5).map((s) => (
                  <SkillTag key={s.name} skill={s} tone="muted" />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="text-muted-foreground">For: <span className="text-foreground">{j?.title}</span></span>
                <div className="flex gap-2">
                  <button className="rounded-md border border-border bg-card px-3 py-1.5 hover:bg-accent">View profile</button>
                  <button className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90">Move to interview</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
