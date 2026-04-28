import { createFileRoute } from "@tanstack/react-router";
import { currentTalent } from "@/lib/mock-data";
import { SkillTag } from "@/components/skill-tag";
import { MatchBar } from "@/components/match-score";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const t = currentTalent;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        {/* Header card */}
        <section className="surface-paper rounded-2xl p-7">
          <div className="flex items-start gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground font-display text-2xl">
              {t.initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-3xl">{t.name}</h2>
              <p className="text-sm text-muted-foreground">{t.headline}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Exploring opportunities
                </span>
                <span>·</span><span>{t.location}</span>
              </div>
            </div>
            <button className="rounded-lg border border-border bg-card px-3 py-2 text-xs hover:bg-accent">Edit</button>
          </div>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/85">{t.bio}</p>
        </section>

        {/* Skills */}
        <section className="rounded-2xl border border-border p-7">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Skills</h3>
            <button className="text-xs text-muted-foreground hover:text-foreground">+ Add skill</button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {t.skills.map((s) => (
              <SkillTag key={s.name} skill={s} tone={s.level === "expert" ? "primary" : "default"} />
            ))}
          </div>
        </section>

        {/* Portfolio */}
        <section>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Portfolio</h3>
            <button className="text-xs text-muted-foreground hover:text-foreground">+ Add piece</button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {t.portfolio.map((p) => (
              <article key={p.id} className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <span>{p.type}</span><span>{p.year}</span>
                </div>
                <h4 className="mt-3 font-display text-lg leading-snug">{p.title}</h4>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Right: completeness */}
      <aside className="space-y-6">
        <div className="surface-paper rounded-2xl p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Profile completeness</div>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-5xl">{t.completeness}<span className="text-2xl text-muted-foreground">%</span></span>
            <span className="text-xs text-primary">+6 this week</span>
          </div>
          <div className="mt-3"><MatchBar value={t.completeness} /></div>
          <ul className="mt-5 space-y-2 text-sm">
            {[
              ["Headline", true], ["Bio", true], ["Skills (5+)", true],
              ["Portfolio (3+)", true], ["Verified email", true], ["Reference link", false],
            ].map(([k, done]) => (
              <li key={k as string} className="flex items-center justify-between">
                <span className={done ? "text-foreground" : "text-muted-foreground"}>{k}</span>
                {done ? (
                  <span className="text-primary">✓</span>
                ) : (
                  <button className="text-xs text-muted-foreground underline-offset-4 hover:underline">Add</button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-warm p-6">
          <div className="font-display text-lg text-warm-foreground">Highlight a project</div>
          <p className="mt-1 text-sm text-warm-foreground/80">Pinned work appears first to recruiters reviewing your profile.</p>
          <button className="mt-4 rounded-md border border-warm-foreground/30 bg-card/40 px-3 py-1.5 text-xs font-medium text-warm-foreground hover:bg-card/70">
            Choose a piece →
          </button>
        </div>
      </aside>
    </div>
  );
}
