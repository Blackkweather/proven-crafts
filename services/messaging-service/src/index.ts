// =============================================================================
// index.ts — services/messaging-service/src/index.ts
// =============================================================================
// The Messaging Service microservice — a standalone Node.js/Fastify HTTP server
// that handles direct messaging between users, with real-time delivery via
// WebSockets for instant message push.
//
// Architecture:
//   - REST endpoints manage conversations and messages in Supabase
//   - A WebSocket endpoint maintains persistent connections per user
//   - When a message is sent, it's saved to the DB AND pushed over WebSocket
//     to the recipient if they are currently connected
//
// Endpoints:
//   GET  /messages/ws                      — WebSocket connection (persistent)
//   GET  /messages/conversations           — list user's conversations
//   GET  /messages/conversations/:id       — get messages in a conversation (paginated)
//   POST /messages/conversations           — start a new conversation
//   POST /messages/conversations/:id/send  — send a message in a conversation
//   GET  /health                           — health check
//
// AUTH: identity is provided by the API Gateway via x-user-id header.
// The WebSocket connection also relies on x-user-id to identify the socket owner.
//
// NOTE: This is a standalone microservice in services/messaging-service/. The main
// frontend app (src/) uses Supabase Realtime for live messaging — this service
// is for the microservices deployment model.
//
// KEYWORDS: AUTH, DATABASE, STATE, API
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3005");

// DATABASE: service-role client — bypasses RLS for trusted server operations
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });
// Register the WebSocket plugin — enables `{ websocket: true }` route options
await app.register(websocket);

/**
 * Extract the authenticated user's ID from the x-user-id header.
 * Injected by the API Gateway.
 */
function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

// STATE: in-memory map of userId → Set of active WebSocket connections.
// A user may have multiple browser tabs open, hence a Set of sockets per user.
// This map is cleared on service restart (cold start) — it does not persist.
const connections = new Map<string, Set<import("ws").WebSocket>>();

// Health check
app.get("/health", async () => ({ status: "ok", service: "messaging-service" }));

// ── WebSocket endpoint for real-time messages ─────────────────────────────────

/**
 * WebSocket endpoint for real-time message delivery.
 * The frontend connects here and stays connected; when a message is sent to
 * this user, the server pushes it over the open socket without any polling.
 *
 * AUTH: requires x-user-id header; closes with 4001 if absent.
 * STATE: registers the socket in the `connections` map on open, removes it on close.
 *
 * WHY WebSockets: REST polling (checking for new messages every N seconds) wastes
 * bandwidth and adds latency. A persistent WebSocket lets the server push messages
 * to the client the moment they arrive.
 */
app.get("/messages/ws", { websocket: true }, (socket, request) => {
  const uid = userId(request as any);
  // AUTH: close the connection if no user identity is available
  if (!uid) {
    socket.close(4001, "Unauthorized");
    return;
  }

  // STATE: add this socket to the user's connection set
  if (!connections.has(uid)) connections.set(uid, new Set());
  connections.get(uid)!.add(socket);

  // STATE: clean up when the socket closes (tab closed, network disconnect, etc.)
  socket.on("close", () => {
    connections.get(uid)?.delete(socket);
    // Remove the user entry entirely if they have no remaining connections
    if (connections.get(uid)?.size === 0) connections.delete(uid);
  });
});

// ── List conversations ────────────────────────────────────────────────────────

/**
 * List all conversations for the current user, with the latest message preview.
 * Sorted by most recently updated so active conversations appear at the top.
 *
 * AUTH: requires x-user-id header
 * DATABASE: reads `conversations` joined to `messages`, filtered to the user's conversations.
 */
app.get("/messages/conversations", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("conversations")
    .select("*, messages(id,text,from_user_id,created_at)")
    .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
    .order("updated_at", { ascending: false });

  if (error) return reply.code(500).send({ error: error.message });
  return reply.send({ conversations: data });
});

// ── Get messages in a conversation ───────────────────────────────────────────

/**
 * Get paginated messages for a conversation.
 * Messages are returned newest-first (descending) for infinite-scroll UIs.
 * As a side effect, marks all unread messages from the other participant as read
 * so the unread badge clears when the user opens the conversation.
 *
 * AUTH: requires x-user-id header
 * DATABASE: reads `messages`, then bulk-updates `read_at` for unread messages.
 */
app.get("/messages/conversations/:id", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };
  const { page = "1", limit = "50" } = request.query as Record<string, string>;

  const { data, error } = await supabase
    .from("messages")
    .select("id, text, from_user_id, created_at, read_at")
    .eq("conversation_id", id)
    .range((+page - 1) * +limit, +page * +limit - 1)
    .order("created_at", { ascending: false }); // newest first for scroll-up loading

  if (error) return reply.code(500).send({ error: error.message });

  // Mark messages from the other participant as read now that we've fetched them.
  // `neq("from_user_id", uid)` ensures we only mark messages we received, not sent.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("from_user_id", uid)
    .is("read_at", null); // only update messages that aren't already read

  return reply.send({ messages: data, page: +page });
});

// ── Start a conversation ──────────────────────────────────────────────────────

/**
 * Start a new conversation or resume an existing one, and send the first message.
 * Checks for an existing conversation between the two participants before creating one
 * so there's only ever one conversation thread between any two users.
 *
 * AUTH: requires x-user-id header
 * DATABASE: reads `conversations` for duplicates, inserts if new, inserts `messages`.
 * API: pushes the new message to the recipient via WebSocket if they're connected.
 */
app.post("/messages/conversations", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { recipientId, initialMessage } = request.body as {
    recipientId: string;
    initialMessage: string;
  };

  // DATABASE: check if a conversation already exists (in either participant order)
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_a.eq.${uid},participant_b.eq.${recipientId}),and(participant_a.eq.${recipientId},participant_b.eq.${uid})`,
    )
    .single();

  let conversationId = existing?.id;

  // If no conversation exists, create one
  if (!conversationId) {
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ participant_a: uid, participant_b: recipientId })
      .select("id")
      .single();
    if (error) return reply.code(500).send({ error: error.message });
    conversationId = newConv.id;
  }

  // DATABASE: insert the initial message
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      from_user_id: uid,
      text: initialMessage,
    })
    .select()
    .single();

  if (msgError) return reply.code(500).send({ error: msgError.message });

  // DATABASE: update the conversation's updated_at so it rises to the top of the list
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  // API: push to recipient via WebSocket if they are currently connected
  const recipientSockets = connections.get(recipientId);
  if (recipientSockets) {
    const payload = JSON.stringify({ type: "new_message", message: msg, conversationId });
    recipientSockets.forEach((ws) => ws.send(payload));
  }

  return reply.code(201).send({ conversationId, message: msg });
});

// ── Send message ──────────────────────────────────────────────────────────────

/**
 * VALIDATION: Zod schema for send message body — text must be non-empty.
 */
const SendBody = z.object({ text: z.string().min(1) });

/**
 * Send a message in an existing conversation.
 * Saves the message to the DB, updates the conversation timestamp,
 * then pushes the message to the recipient via WebSocket for instant delivery.
 *
 * AUTH: requires x-user-id header
 * DATABASE: inserts `messages`, updates `conversations.updated_at`.
 * API: pushes via WebSocket to the other conversation participant if connected.
 */
app.post("/messages/conversations/:id/send", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };
  const body = SendBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  // DATABASE: insert the message
  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      from_user_id: uid,
      text: body.data.text,
    })
    .select()
    .single();

  if (error) return reply.code(500).send({ error: error.message });

  // DATABASE: bump the conversation's updated_at so it re-sorts to the top
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  // DATABASE: find the other participant so we know who to push to
  const { data: conv } = await supabase
    .from("conversations")
    .select("participant_a,participant_b")
    .eq("id", id)
    .single();

  // Determine the recipient: whoever is NOT the sender
  const recipientId = conv?.participant_a === uid ? conv?.participant_b : conv?.participant_a;

  // API: push to recipient via WebSocket if they have an active connection
  if (recipientId) {
    connections
      .get(recipientId)
      ?.forEach((ws) =>
        ws.send(JSON.stringify({ type: "new_message", message: msg, conversationId: id })),
      );
  }

  return reply.code(201).send(msg);
});

// Start the server
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Messaging Service running on port ${PORT}`);
});
