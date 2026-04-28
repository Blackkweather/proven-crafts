import { cn } from "@/lib/utils";

export function MatchScore({
  value,
  size = "md",
  label = "match",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const tone =
    value >= 90 ? "text-primary" : value >= 75 ? "text-foreground" : "text-muted-foreground";
  const sizes = {
    sm: { num: "text-lg", lbl: "text-[10px]" },
    md: { num: "text-3xl", lbl: "text-xs" },
    lg: { num: "text-5xl", lbl: "text-sm" },
  }[size];

  return (
    <div className="flex flex-col items-end leading-none">
      <span className={cn("font-display tabular-nums", sizes.num, tone)}>
        {value}
        <span className="text-foreground/40 text-[0.5em] align-top">%</span>
      </span>
      <span className={cn("uppercase tracking-[0.18em] text-muted-foreground mt-1", sizes.lbl)}>
        {label}
      </span>
    </div>
  );
}

export function MatchBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-700"
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}
