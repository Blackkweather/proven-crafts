// =============================================================================
// match-score.tsx — src/components/match-score.tsx
// =============================================================================
// Two small display components for showing AI-generated match scores:
//
//   <MatchScore value={87} />    — renders "87%" in a size- and colour-coded display
//   <MatchBar value={87} />      — renders a horizontal progress bar at 87% width
//
// These are pure presentational components — they receive a number and render
// a visual representation. No state, no data fetching. The `value` comes from
// the AI match score stored on Application and Submission rows in the database.
//
// KEYWORDS: STATE
// =============================================================================

import { cn } from "@/lib/utils";

/**
 * Display a numeric match percentage with colour coding and three size variants.
 *
 * Colour rules:
 *   >= 90  → primary colour (strong positive signal)
 *   >= 75  → default foreground (good fit)
 *   < 75   → muted (weak fit)
 *
 * Size variants:
 *   "sm" — small inline score (e.g., inside a card)
 *   "md" — default medium score (default)
 *   "lg" — large hero score (e.g., top of a profile page)
 *
 * @param value  - The score from 0 to 100
 * @param size   - Controls font size ("sm" | "md" | "lg"), defaults to "md"
 * @param label  - Text shown below the number, defaults to "match"
 */
export function MatchScore({
  value,
  size = "md",
  label = "match",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  // Determine colour based on score thresholds
  const tone =
    value >= 90 ? "text-primary" : value >= 75 ? "text-foreground" : "text-muted-foreground";

  // Map size prop to specific Tailwind font-size classes for the number and label
  const sizes = {
    sm: { num: "text-lg", lbl: "text-[10px]" },
    md: { num: "text-3xl", lbl: "text-xs" },
    lg: { num: "text-5xl", lbl: "text-sm" },
  }[size];

  return (
    <div className="flex flex-col items-end leading-none">
      {/* The numeric score — tabular-nums keeps digit widths consistent */}
      <span className={cn("font-display tabular-nums", sizes.num, tone)}>
        {value}
        {/* The % sign is rendered smaller and top-aligned for a superscript effect */}
        <span className="text-foreground/40 text-[0.5em] align-top">%</span>
      </span>
      {/* The label text below the number (e.g., "match") */}
      <span className={cn("uppercase tracking-[0.18em] text-muted-foreground mt-1", sizes.lbl)}>
        {label}
      </span>
    </div>
  );
}

/**
 * A thin horizontal progress bar representing a match score from 0 to 100.
 * The bar width is clamped between 2% (always visible minimum) and 100%.
 * The `transition-all duration-700` class animates the bar growing on mount.
 *
 * @param value - The score from 0 to 100
 */
export function MatchBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-700"
        // Math.max(2, ...) ensures even a score of 0 shows a tiny sliver
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}
