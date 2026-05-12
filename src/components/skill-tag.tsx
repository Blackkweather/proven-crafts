// =============================================================================
// skill-tag.tsx — src/components/skill-tag.tsx
// =============================================================================
// A pill-shaped tag component that displays a skill with its proficiency level
// (shown as 1-4 filled bars) and an optional verification badge icon.
//
// Used throughout the app wherever skills are listed: talent profile cards,
// job requirement lists, challenge required-skills sections, etc.
//
// The component is purely presentational — it receives a Skill object and
// renders it. No state, no data fetching.
//
// KEYWORDS: STATE
// =============================================================================

import { cn } from "@/lib/utils";

// These types mirror the ones in db.ts but are redefined here so this component
// file is self-contained and can be used without importing from db.ts.
export type SkillLevel = "foundational" | "proficient" | "advanced" | "expert";
export type VerifiedBy = "challenge" | "portfolio" | "reference";

/** The data needed to render a SkillTag. */
export interface Skill {
  name: string;
  level: SkillLevel;
  verifiedBy?: VerifiedBy;
}

/**
 * Maps each skill level to a human-readable label and a number of filled bars (1-4).
 * The bars give a quick visual indicator of proficiency without needing to read text.
 */
const skillLevelMeta: Record<SkillLevel, { label: string; bars: number }> = {
  foundational: { label: "Foundational", bars: 1 },
  proficient: { label: "Proficient", bars: 2 },
  advanced: { label: "Advanced", bars: 3 },
  expert: { label: "Expert", bars: 4 },
};

/**
 * Maps each verification source to a small icon character.
 * These icons appear inside the tag next to the skill name when the skill
 * has been verified through a specific method.
 *   ⚡ = verified by completing a challenge
 *   ✦ = verified via a portfolio piece
 *   ◎ = verified by a reference/endorsement
 */
const verifiedIcon: Record<VerifiedBy, string> = {
  challenge: "⚡",
  portfolio: "✦",
  reference: "◎",
};

/**
 * A pill-shaped skill tag showing the skill name, proficiency bars, and verification icon.
 *
 * @param skill - The skill data (name, level, optional verifiedBy)
 * @param tone  - Visual style variant:
 *   "default"  — neutral card style with hover effect (default)
 *   "primary"  — highlighted in the brand primary colour (e.g., for matching skills)
 *   "muted"    — low-contrast style for secondary listings
 */
export function SkillTag({
  skill,
  tone = "default",
}: {
  skill: Skill;
  tone?: "default" | "primary" | "muted";
}) {
  // Look up the metadata for this skill level; fall back to "proficient" if unknown
  const meta = skillLevelMeta[skill.level] ?? skillLevelMeta.proficient;

  // Build an array of 4 booleans where `true` means the bar should be filled.
  // For example, "advanced" (3 bars) gives [true, true, true, false].
  const bars = Array.from({ length: 4 }, (_, i) => i < meta.bars);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "muted" && "border-border bg-muted text-muted-foreground",
        tone === "default" && "border-border bg-card text-foreground hover:bg-accent",
      )}
      // Tooltip: show full skill info on hover for accessibility
      title={`${skill.name} · ${meta.label}${skill.verifiedBy ? ` · verified by ${skill.verifiedBy}` : ""}`}
    >
      {/* Skill name */}
      <span>{skill.name}</span>

      {/* Verification icon — only shown if the skill has been verified */}
      {skill.verifiedBy && (
        <span className="opacity-70 text-[10px]" aria-label={`Verified by ${skill.verifiedBy}`}>
          {verifiedIcon[skill.verifiedBy]}
        </span>
      )}

      {/* Proficiency bars — 4 thin vertical lines where filled ones indicate level.
          aria-hidden because the title tooltip conveys the same information. */}
      <span className="flex gap-0.5" aria-hidden>
        {bars.map((on, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 w-0.5 rounded-full",
              // Filled bars use the brand primary or foreground colour; empty bars are very faint
              on ? (tone === "primary" ? "bg-primary" : "bg-foreground/70") : "bg-foreground/15",
            )}
          />
        ))}
      </span>
    </span>
  );
}
