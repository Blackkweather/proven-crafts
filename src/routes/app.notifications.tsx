import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/hooks";

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
  const { user } = useAuth();
  const { notifications, loading, unreadCount, markAllRead } = useNotifications(user?.id);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{unreadCount} unread · last 30 days</p>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="font-display text-xl text-muted-foreground">All caught up</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Notifications appear here when companies match, message, or respond to you.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          {notifications.map((n, i) => {
            const meta = kindMeta[n.kind];
            const isUnread = !n.read_at;
            return (
              <div
                key={n.id}
                className={
                  "flex gap-4 p-5 " +
                  (i > 0 ? "border-t border-border " : "") +
                  (isUnread ? "bg-paper" : "")
                }
              >
                <span
                  className={
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest h-fit " +
                    meta.color
                  }
                >
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>}
                  {n.link && (
                    <Link
                      to={n.link as never}
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      View →
                    </Link>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
