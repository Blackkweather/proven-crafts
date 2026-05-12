// =============================================================================
// global-search.tsx — src/components/global-search.tsx
// =============================================================================
// A full-screen search overlay that searches jobs, challenges, and talent
// simultaneously as the user types. Triggered by the Cmd+K / Ctrl+K keyboard
// shortcut or by the <SearchTrigger> button exported at the bottom of this file.
//
// The component renders as `null` when closed, so it has zero DOM cost when
// not in use. Search results are debounced (via the `useSearch` hook) to avoid
// firing a DB query on every keystroke.
//
// KEYWORDS: STATE, DATABASE, API
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSearch } from "@/lib/hooks";

/**
 * Full-screen search overlay with keyboard shortcut support.
 * Renders `null` when closed — drop this component anywhere in your layout
 * and it will be invisible until the user triggers it.
 *
 * STATE: `open` controls whether the overlay is visible.
 * STATE: `query` is the current search input value.
 * API: uses the `useSearch` hook which calls `searchAll` in db.ts after a 300ms debounce.
 */
export function GlobalSearch() {
  // STATE: whether the search modal is currently open
  const [open, setOpen] = useState(false);
  // STATE: the current text in the search input
  const [query, setQuery] = useState("");
  // Ref to the input element so we can focus it programmatically when the modal opens
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // useSearch returns debounced results and a loading flag from db.ts's searchAll()
  const { results, loading } = useSearch(query);

  // Derived: whether there are any results to show across any of the three categories
  const hasResults =
    results.jobs.length > 0 || results.challenges.length > 0 || results.talent.length > 0;

  // Cmd+K / Ctrl+K shortcut to open/close the search overlay
  // Escape always closes it
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); // prevent browser's address bar focus shortcut
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    // Clean up the listener when this component unmounts
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the search input automatically when the overlay opens
  // The 50ms delay is needed because the element needs to be in the DOM first
  useEffect(() => {
    if (open) {
      setQuery(""); // clear previous search when re-opening
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /**
   * Navigate to a result URL and close the overlay.
   * Using the TanStack router's navigate function keeps navigation within the SPA
   * rather than doing a full page reload.
   */
  function navigate(href: string) {
    setOpen(false);
    router.navigate({ to: href as never });
  }

  // When closed, render nothing — zero DOM cost
  if (!open) return null;

  return (
    // Backdrop: semi-transparent overlay covering the entire screen.
    // Clicking the backdrop closes the search.
    <div
      className="fixed inset-0 z-[100] grid place-items-start justify-center bg-foreground/40 pt-[15vh] animate-fade-in"
      onClick={() => setOpen(false)}
    >
      {/* Search panel: stop click propagation so clicking inside doesn't close the modal */}
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row: search icon + text input + loading spinner + Esc hint */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg
            className="shrink-0 text-muted-foreground"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs, challenges, people…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {/* Loading spinner — shown while the debounced query is in flight */}
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
          )}
          <kbd className="hidden rounded border border-border bg-paper px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            esc
          </kbd>
        </div>

        {/* Results panel — scrollable, max 60% of viewport height */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() ? (
            // Empty state: prompt the user to start typing
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <span>Start typing to search</span>
              <kbd className="rounded border border-border bg-paper px-2 py-1 text-xs">⌘K</kbd>
            </div>
          ) : !hasResults && !loading ? (
            // No results state
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            // Results grouped by category (Jobs / Challenges / People)
            <div className="divide-y divide-border">
              {results.jobs.length > 0 && (
                <ResultSection label="Jobs">
                  {results.jobs.map((j) => (
                    <ResultRow
                      key={j.id}
                      icon="💼"
                      title={j.title}
                      subtitle={j.summary}
                      onClick={() => navigate(`/jobs/${j.id}`)}
                    />
                  ))}
                </ResultSection>
              )}
              {results.challenges.length > 0 && (
                <ResultSection label="Challenges">
                  {results.challenges.map((c) => (
                    <ResultRow
                      key={c.id}
                      icon="⚡"
                      title={c.title}
                      subtitle={c.brief}
                      onClick={() => navigate(`/challenges/${c.id}`)}
                    />
                  ))}
                </ResultSection>
              )}
              {results.talent.length > 0 && (
                <ResultSection label="People">
                  {results.talent.map((t) => (
                    <ResultRow
                      key={t.id}
                      icon="👤"
                      title={t.display_name}
                      subtitle={t.headline ?? ""}
                      onClick={() => navigate(`/talent/${t.id}`)}
                    />
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A labelled section header for grouping search results (e.g., "Jobs", "People").
 * Internal helper component — not exported.
 */
function ResultSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

/**
 * A single clickable result row with an icon, title, and subtitle.
 * Titles and subtitles are truncated to one line to keep the list compact.
 * Internal helper component — not exported.
 */
function ResultRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent"
    >
      <span className="text-base">{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );
}

/**
 * A button that opens the GlobalSearch overlay when clicked.
 * Drop this into any header or toolbar — it fires the same Cmd+K keyboard
 * event that the global listener uses, so there's only one code path to open search.
 *
 * An optional `className` prop lets you override the default button styling.
 */
export function SearchTrigger({ className }: { className?: string }) {
  return (
    <button
      onClick={() =>
        // Dispatch the same keyboard event as Cmd+K so the GlobalSearch component
        // handles it through its existing keydown listener
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
      }
      className={
        className ??
        "flex items-center gap-2 rounded-lg border border-border bg-paper px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
      }
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <span>Search</span>
      <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] sm:block">
        ⌘K
      </kbd>
    </button>
  );
}
