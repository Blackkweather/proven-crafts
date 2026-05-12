import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchAllUsers, suspendUser, reinstateUser, type Profile } from "@/lib/db";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type UserRow = Profile & { suspended: boolean };

function AdminUsers() {
  const [people, setPeople] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [suspending, setSuspending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAllUsers()
      .then((users) => {
        if (!cancelled) {
          setPeople(
            users
              .filter((u) => u.account_type === "talent")
              .map((u) => ({ ...u, suspended: false })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled)
          console.error("Failed to load users:", err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = people.filter(
    (p) =>
      p.display_name.toLowerCase().includes(q.toLowerCase()) ||
      (p.headline ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  async function handleSuspendToggle(p: UserRow) {
    setSuspending(p.id);
    try {
      if (!p.suspended) {
        await suspendUser(p.id);
        setPeople((xs) => xs.map((x) => (x.id === p.id ? { ...x, suspended: true } : x)));
      } else {
        await reinstateUser(p.id);
        setPeople((xs) => xs.map((x) => (x.id === p.id ? { ...x, suspended: false } : x)));
      }
    } catch (err) {
      console.error("Suspend/reinstate failed:", err instanceof Error ? err.message : String(err));
    } finally {
      setSuspending(null);
    }
  }

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${people.length} talent profiles`}
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-64 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[3fr_2fr_1fr_1fr_auto] gap-4 border-b border-border bg-paper px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <div>Name</div>
          <div>Headline</div>
          <div>Location</div>
          <div>Completeness</div>
          <div>Action</div>
        </div>

        {loading && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading users…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No users found.</div>
        )}

        {!loading &&
          filtered.map((p, i) => (
            <div
              key={p.id}
              className={
                "grid grid-cols-[3fr_2fr_1fr_1fr_auto] gap-4 px-5 py-3 items-center text-sm " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background text-xs font-display">
                  {initials(p.display_name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.display_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.id}</div>
                </div>
              </div>
              <div className="truncate text-muted-foreground">{p.headline}</div>
              <div className="text-muted-foreground">{p.location}</div>
              <div>
                <span className="font-display">
                  {p.completeness_pct}
                  <span className="text-xs text-muted-foreground">%</span>
                </span>
              </div>
              <button
                disabled={suspending === p.id}
                onClick={() => handleSuspendToggle(p)}
                className={
                  "rounded-md px-3 py-1.5 text-xs disabled:opacity-50 " +
                  (p.suspended
                    ? "bg-foreground text-background"
                    : "border border-border hover:bg-accent")
                }
              >
                {suspending === p.id ? "…" : p.suspended ? "Reinstate" : "Suspend"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
