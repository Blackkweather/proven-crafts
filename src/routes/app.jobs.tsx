import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { currentTalent, jobs, getCompany, matchScore } from "@/lib/mock-data";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/app/jobs")({
  component: JobsPage,
});

function JobsPage() {
  const [query, setQuery] = useState("");
  const list = jobs
    .map((j) => ({ ...j, score: matchScore(j.requiredSkills, currentTalent.skills) }))
    .filter((j) => j.title.toLowerCase().includes(query.toLowerCase()) || j.requiredSkills.some((s) => s.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => b.score - a.score);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{list.length} roles matching your skills, sorted by signal.</p>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by skill or title…"
            className="w-72 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {list.map((j) => {
          const co = getCompany(j.companyId);
          return (
            <article key={j.id} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft">
              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="grid h-6 w-6 place-items-center rounded bg-foreground text-background font-display text-[10px]">{co.initials}</div>
                    <span className="font-medium text-foreground">{co.name}</span>
                    <span>·</span><span>{co.industry}</span>
                  </div>
                  <h3 className="mt-2 font-display text-xl">{j.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{j.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {j.requiredSkills.map((s) => {
                      const matched = currentTalent.skills.some((sk) => sk.name.toLowerCase() === s.toLowerCase());
                      return (
                        <span key={s} className={"rounded-full border px-2 py-0.5 text-[11px] " + (matched ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-paper text-muted-foreground")}>
                          {s}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{j.location}</span><span>·</span>
                    <span>{j.arrangement}</span><span>·</span>
                    <span>{j.comp}</span><span>·</span>
                    <span>{j.applicants} applied</span><span>·</span>
                    <span>{j.postedDays}d ago</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <MatchScore value={j.score} />
                  <button className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90">Apply</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
