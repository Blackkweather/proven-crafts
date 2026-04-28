import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { notifications as initial } from "@/lib/mock-data";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

const kindMeta = {
  match: { label: "Match", color: "bg-primary/10 text-primary border-primary/20" },
  application: { label: "Application", color: "bg-warm text-warm-foreground border-warm/40" },
  message: { label: "Message", color: "bg-foreground/5 text-foreground border-border" },
  challenge: { label: "Challenge", color: "bg-accent text-foreground border-border" },
};

function NotificationsPage() {
  const [items, setItems] = useState(initial);
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unread} unread · last 30 days</p>
        <button onClick={() => setItems((xs) => xs.map((x) => ({ ...x, read: true })))} className="text-xs text-muted-foreground hover:text-foreground">
          Mark all read
        </button>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {items.map((n, i) => {
          const meta = kindMeta[n.kind];
          return (
            <div key={n.id} className={"flex gap-4 p-5 " + (i > 0 ? "border-t border-border " : "") + (n.read ? "" : "bg-paper")}>
              <span className={"shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest h-fit " + meta.color}>{meta.label}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{n.title}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{n.at}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
