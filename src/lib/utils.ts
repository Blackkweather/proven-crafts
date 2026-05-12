// =============================================================================
// utils.ts — src/lib/utils.ts
// =============================================================================
// Shared utility functions used throughout the UI. Currently exports the `cn`
// helper for combining Tailwind CSS class names. This is the standard pattern
// in shadcn/ui projects — import `cn` from here whenever you need to merge
// conditional or dynamic class names without class conflicts.
//
// KEYWORDS: STATE
// =============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names, resolving conflicts intelligently.
 *
 * `clsx` handles conditional and array-based class expressions (e.g.,
 * `cn("base", isActive && "text-blue-500", ["extra-class"])`).
 *
 * `twMerge` then resolves Tailwind conflicts so that later classes win
 * (e.g., `cn("p-4", "p-8")` correctly produces just "p-8" instead of
 * both utility classes fighting each other).
 *
 * Usage example:
 *   <div className={cn("p-4 text-sm", isError && "text-red-500", className)} />
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
