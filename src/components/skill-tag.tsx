import { cn } from "@/lib/utils";

export type SkillLevel = "foundational" | "proficient" | "advanced" | "expert";
export type VerifiedBy = "challenge" | "portfolio" | "reference";

export interface Skill {
  name: string;
  level: SkillLevel;
  verifiedBy?: VerifiedBy;
}

const skillLevelMeta: Record<SkillLevel, { label: string; bars: number }> = {
  foundational: { label: "Foundational", bars: 1 },
  proficient: { label: "Proficient", bars: 2 },
  advanced: { label: "Advanced", bars: 3 },
  expert: { label: "Expert", bars: 4 },
};

const verifiedIcon: Record<VerifiedBy, string> = {
  challenge: "⚡",
  portfolio: "✦",
  reference: "◎",
};

export function SkillTag({
  skill,
  tone = "default",
}: {
  skill: Skill;
  tone?: "default" | "primary" | "muted";
}) {
  const meta = skillLevelMeta[skill.level] ?? skillLevelMeta.proficient;
  const bars = Array.from({ length: 4 }, (_, i) => i < meta.bars);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "muted" && "border-border bg-muted text-muted-foreground",
        tone === "default" && "border-border bg-card text-foreground hover:bg-accent",
      )}
      title={`${skill.name} · ${meta.label}${skill.verifiedBy ? ` · verified by ${skill.verifiedBy}` : ""}`}
    >
      <span>{skill.name}</span>
      {skill.verifiedBy && (
        <span className="opacity-70 text-[10px]" aria-label={`Verified by ${skill.verifiedBy}`}>
          {verifiedIcon[skill.verifiedBy]}
        </span>
      )}
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
