import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { challenges, currentTalent, getCompany, matchScore } from "@/lib/mock-data";

export const Route = createFileRoute("/app/challenges")({
  component: ChallengesPage,
});

function ChallengesPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = challenges.find((c) => c.id === openId);

  return (
    <div>
      <p className="text-sm text-muted-foreground">Focused briefs. Real evaluation. Most take a weekend.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {challenges.map((c) => {
          const co = getCompany(c.companyId);
          const score = matchScore(c.requiredSkills, currentTalent.skills);
          return (
            <article key={c.id} className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <span>{co.name}</span>
                <span className={c.deadlineDays <= 7 ? "text-destructive" : ""}>{c.deadlineDays}d left</span>
              </div>
              <h3 className="mt-3 font-display text-xl leading-snug">{c.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{c.brief}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.requiredSkills.map((s) => (
                  <span key={s} className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="font-mono text-xs text-muted-foreground">{c.submissions} entries · {score}% match</span>
                <button onClick={() => setOpenId(c.id)} className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90">
                  Submit →
                </button>
              </div>
              {c.prize && <div className="mt-3 text-[11px] text-warm-foreground">🏆 {c.prize}</div>}
            </article>
          );
        })}
      </div>

      {open && <SubmitDialog onClose={() => setOpenId(null)} title={open.title} />}
    </div>
  );
}

function SubmitDialog({ onClose, title }: { onClose: () => void; title: string }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-background p-8 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Submit your work</div>
        <h2 className="mt-2 font-display text-2xl">{title}</h2>
        {submitted ? (
          <div className="mt-8 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
            <div className="font-display text-xl text-primary">Submission received.</div>
            <p className="mt-1 text-sm text-muted-foreground">Reviewers typically respond within 5 business days.</p>
            <button onClick={onClose} className="mt-5 rounded-md bg-foreground px-4 py-2 text-xs text-background">Close</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">Link to your work</label>
              <input required type="url" placeholder="https://" className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">Walkthrough</label>
              <textarea required rows={5} placeholder="Explain your decisions, trade-offs, and what you'd do next." className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            </div>
            <div className="rounded-lg border border-dashed border-border bg-paper p-5 text-center">
              <div className="text-sm font-medium">Drop files here</div>
              <div className="mt-1 text-xs text-muted-foreground">Up to 25MB · PDF, ZIP, MP4</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-accent">Cancel</button>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Submit</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
