import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchContactSubmissions, type ContactSubmission } from "@/lib/db";

export const Route = createFileRoute("/admin/contact")({
  component: AdminContact,
});

function AdminContact() {
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchContactSubmissions()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="max-w-3xl">
      {error && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        {items.length} message{items.length !== 1 ? "s" : ""} received
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-paper p-12 text-center">
          <div className="font-display text-2xl">No messages yet.</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Submissions from the contact form appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((s) => {
            const open = expanded === s.id;
            const age = formatAge(s.created_at);
            return (
              <article key={s.id} className="rounded-2xl border border-border bg-card">
                <button
                  onClick={() => setExpanded(open ? null : s.id)}
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.company && (
                        <span className="text-xs text-muted-foreground">· {s.company}</span>
                      )}
                      <span className="rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {s.topic}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.email} · {age} ago
                    </div>
                    {!open && (
                      <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{s.message}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="border-t border-border px-5 pb-5 pt-4">
                    <p className="text-sm leading-relaxed">{s.message}</p>
                    <a
                      href={`mailto:${s.email}?subject=Re: ${encodeURIComponent(s.topic)} inquiry`}
                      className="mt-4 inline-flex rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground/90"
                    >
                      Reply via email →
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
