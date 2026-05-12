import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSearch } from "@/lib/hooks";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { results, loading } = useSearch(query);

  const hasResults =
    results.jobs.length > 0 || results.challenges.length > 0 || results.talent.length > 0;

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function navigate(href: string) {
    setOpen(false);
    router.navigate({ to: href as never });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-start justify-center bg-foreground/40 pt-[15vh] animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
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
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
          )}
          <kbd className="hidden rounded border border-border bg-paper px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!query.trim() ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <span>Start typing to search</span>
              <kbd className="rounded border border-border bg-paper px-2 py-1 text-xs">⌘K</kbd>
            </div>
          ) : !hasResults && !loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
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

/** Trigger button to open the search. Drop this into any header. */
export function SearchTrigger({ className }: { className?: string }) {
  return (
    <button
      onClick={() =>
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
