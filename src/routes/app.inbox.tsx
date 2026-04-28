import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { conversations as initial, type Conversation } from "@/lib/mock-data";

export const Route = createFileRoute("/app/inbox")({
  component: InboxPage,
});

export function InboxPage() {
  const [convos, setConvos] = useState(initial);
  const [activeId, setActiveId] = useState(convos[0]?.id);
  const [draft, setDraft] = useState("");
  const active = convos.find((c) => c.id === activeId);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !active) return;
    const updated: Conversation[] = convos.map((c) =>
      c.id === active.id
        ? { ...c, messages: [...c.messages, { from: "me", text: draft, at: "now" }], lastMessage: draft, lastAt: "now" }
        : c,
    );
    setConvos(updated);
    setDraft("");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid h-[calc(100dvh-12rem)] grid-cols-[280px_1fr]">
        <aside className="overflow-y-auto border-r border-border bg-paper">
          {convos.map((c) => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={"w-full border-b border-border px-4 py-4 text-left transition-colors " + (active ? "bg-card" : "hover:bg-card/60")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{c.withName}</span>
                  <span className="text-[10px] text-muted-foreground">{c.lastAt}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.withRole}</div>
                <div className="mt-1.5 line-clamp-1 text-sm text-foreground/80">{c.lastMessage}</div>
                {c.unread > 0 && <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </aside>

        <section className="flex min-w-0 flex-col">
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <div className="font-display text-lg">{active.withName}</div>
                  <div className="text-xs text-muted-foreground">{active.withRole}</div>
                </div>
                <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">View context</button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {active.messages.map((m, i) => (
                  <div key={i} className={"max-w-md " + (m.from === "me" ? "ml-auto text-right" : "")}>
                    <div className={"inline-block rounded-2xl px-4 py-2.5 text-sm " + (m.from === "me" ? "bg-foreground text-background" : "bg-paper border border-border")}>
                      {m.text}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{m.at}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-paper p-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="flex-1 rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                <button className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Send</button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">No conversation selected.</div>
          )}
        </section>
      </div>
    </div>
  );
}
