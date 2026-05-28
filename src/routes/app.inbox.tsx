import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useConversations, useMessages } from "@/lib/hooks";
import { sendMessage, createNotification, markMessageRead } from "@/lib/db";
import type { Conversation } from "@/lib/db";

export const Route = createFileRoute("/app/inbox")({
  component: InboxPage,
  validateSearch: (s: Record<string, unknown>) => ({
    conv: s.conv as string | undefined,
  }),
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
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function InboxPage() {
  const { user } = useAuth();
  const { conv: convFromUrl } = useSearch({ strict: false }) as { conv?: string };
  const { conversations, loading: convsLoading } = useConversations(user?.id);
  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select conversation from URL ?conv= param (e.g. navigated from matches page)
  useEffect(() => {
    if (convFromUrl) setActiveId(convFromUrl);
  }, [convFromUrl]);

  const activeConvId = activeId || conversations[0]?.id || "";
  const active = conversations.find((c) => c.id === activeConvId) ?? null;

  const { messages, loading: msgsLoading } = useMessages(activeConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark unread messages from the other person as read when they appear in view
  useEffect(() => {
    if (!user || !messages.length) return;
    messages
      .filter((m) => m.sender_id !== user.id && m.read_at === null)
      .forEach((m) => markMessageRead(m.id).catch(() => {}));
  }, [messages, user]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeConvId || !user || !active) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(activeConvId, user.id, draft.trim());
      const recipientId =
        active.participant_a === user.id ? active.participant_b : active.participant_a;
      createNotification({
        user_id: recipientId,
        kind: "message",
        title: "New message",
        body: draft.trim().slice(0, 80),
        link: `/app/inbox?conv=${activeConvId}`,
      }).catch(() => {});
      setDraft("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send message");
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
            const hasUnread =
              c.last_message?.read_at === null && c.last_message?.sender_id !== user?.id;
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
                  <div className="flex items-center gap-1.5">
                    {hasUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                    <span className="text-[10px] text-muted-foreground">{lastAt}</span>
                  </div>
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
                  {(() => {
                    const otherProfile =
                      user && active.participant_a !== user.id
                        ? active.profile_a
                        : active.profile_b;
                    const headline = otherProfile?.headline;
                    return headline ? (
                      <div className="text-xs text-muted-foreground mt-0.5">{headline}</div>
                    ) : null;
                  })()}
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
                <div ref={messagesEndRef} />
              </div>

              {sendError && (
                <div className="mx-4 mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {sendError}
                </div>
              )}
              <form
                onSubmit={send}
                className="flex items-end gap-2 border-t border-border bg-paper p-4"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(e as unknown as React.FormEvent);
                    }
                  }}
                  rows={1}
                  placeholder="Write a message…"
                  style={{ resize: "none" }}
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
