import { cn } from "@/lib/utils";
import { skillLevelMeta, type Skill } from "@/lib/mock-data";

export function SkillTag({ skill, tone = "default" }: { skill: Skill; tone?: "default" | "primary" | "muted" }) {
  const meta = skillLevelMeta[skill.level];
  const bars = Array.from({ length: 4 }, (_, i) => i < meta.bars);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "muted" && "border-border bg-muted text-muted-foreground",
        tone === "default" && "border-border bg-card text-foreground hover:bg-accent",
      )}
      title={`${skill.name} · ${meta.label}`}
    >
      <span>{skill.name}</span>
      <span className="flex gap-0.5" aria-hidden>
        {bars.map((on, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-0.5 rounded-full",
              on ? (tone === "primary" ? "bg-primary" : "bg-foreground/70") : "bg-foreground/15",
            )}
          />
        ))}
      </span>
    </span>
  );
}
