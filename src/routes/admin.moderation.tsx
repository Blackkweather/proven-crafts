import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin/moderation")({
  component: Moderation,
});

interface Report {
  id: string;
  type: "profile" | "submission" | "message";
  reason: string;
  subject: string;
  reporter: string;
  age: string;
}

const seed: Report[] = [
  { id: "r1", type: "profile", subject: "Kai Bauer", reason: "Misrepresented work history", reporter: "system", age: "2h" },
  { id: "r2", type: "submission", subject: "Submission #5912 · API key challenge", reason: "Suspected AI-generated without disclosure", reporter: "Lena Park", age: "5h" },
  { id: "r3", type: "message", subject: "Conversation cv-1192", reason: "Off-platform recruitment", reporter: "Anya Sharma", age: "1d" },
];

function Moderation() {
  const [items, setItems] = useState(seed);

  function resolve(id: string) {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-muted-foreground">{items.length} open reports · queue is calm</p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-paper p-12 text-center">
          <div className="font-display text-2xl">All clear.</div>
          <p className="mt-1 text-sm text-muted-foreground">Nothing in the queue. Good time for tea.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{r.type}</span>
                  <h3 className="mt-2 font-display text-lg">{r.subject}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
                  <div className="mt-2 text-xs text-muted-foreground">Reported by {r.reporter} · {r.age} ago</div>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button onClick={() => resolve(r.id)} className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background hover:bg-foreground/90">Resolve</button>
                  <button onClick={() => resolve(r.id)} className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/15">Suspend</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
