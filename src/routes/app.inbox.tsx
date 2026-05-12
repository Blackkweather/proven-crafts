import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useConversations, useMessages } from "@/lib/hooks";
import { sendMessage } from "@/lib/db";
import type { Conversation } from "@/lib/db";

export const Route = createFileRoute("/app/inbox")({
  component: InboxPage,
});

function getOtherName(conv: Conversation, userId: string): string {
  if (conv.participant_a !== userId) {
    return conv.profile_a?.display_name ?? "User";
  }
  return conv.profile_b?.display_name ?? "User";
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function InboxPage() {
  const { user } = useAuth();
  const { conversations, loading: convsLoading } = useConversations(user?.id);
  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Set initial active when conversations load (only once)
  const activeConvId = activeId || conversations[0]?.id || "";
  const active = conversations.find((c) => c.id === activeConvId) ?? null;

  const { messages, loading: msgsLoading } = useMessages(activeConvId);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeConvId || !user) return;
    setSending(true);
    try {
      await sendMessage(activeConvId, user.id, draft.trim());
      setDraft("");
    } catch (err) {
      console.error("Failed to send message:", err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid h-[calc(100dvh-12rem)] grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="overflow-y-auto border-r border-border bg-paper">
          {convsLoading && (
            <div className="grid place-items-center py-12 text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!convsLoading && conversations.length === 0 && (
            <div className="grid place-items-center py-12 text-sm text-muted-foreground">
              No conversations yet.
            </div>
          )}
          {conversations.map((c) => {
            const isActive = c.id === activeConvId;
            const otherName = user ? getOtherName(c, user.id) : "User";
            const lastMsg = c.last_message?.body ?? "";
            const lastAt = formatTime(c.last_message_at);
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={
                  "w-full border-b border-border px-4 py-4 text-left transition-colors " +
                  (isActive ? "bg-card" : "hover:bg-card/60")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{otherName}</span>
                  <span className="text-[10px] text-muted-foreground">{lastAt}</span>
                </div>
                <div className="mt-1.5 line-clamp-1 text-sm text-foreground/80">
                  {lastMsg || "No messages yet"}
                </div>
              </button>
            );
          })}
        </aside>

        {/* Main panel */}
        <section className="flex min-w-0 flex-col">
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <div className="font-display text-lg">
                    {user ? getOtherName(active, user.id) : "Conversation"}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {msgsLoading && (
                  <div className="text-center text-sm text-muted-foreground">Loading messages…</div>
                )}
                {!msgsLoading && messages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    No messages yet. Say hello!
                  </div>
                )}
                {messages.map((m) => {
                  const isMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={"max-w-md " + (isMe ? "ml-auto text-right" : "")}>
                      <div
                        className={
                          "inline-block rounded-2xl px-4 py-2.5 text-sm " +
                          (isMe ? "bg-foreground text-background" : "bg-paper border border-border")
                        }
                      >
                        {m.body}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {formatTime(m.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={send}
                className="flex items-center gap-2 border-t border-border bg-paper p-4"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="flex-1 rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                <button
                  disabled={sending || !draft.trim()}
                  className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              {convsLoading ? "Loading…" : "No conversation selected."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
