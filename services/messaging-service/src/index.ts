import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3005");
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });
await app.register(websocket);

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

// In-memory map of userId -> WebSocket connection for real-time push
const connections = new Map<string, Set<import("ws").WebSocket>>();

app.get("/health", async () => ({ status: "ok", service: "messaging-service" }));

// ── WebSocket endpoint for real-time messages ─────────────────────────────────
app.get("/messages/ws", { websocket: true }, (socket, request) => {
  const uid = userId(request as any);
  if (!uid) {
    socket.close(4001, "Unauthorized");
    return;
  }

  if (!connections.has(uid)) connections.set(uid, new Set());
  connections.get(uid)!.add(socket);

  socket.on("close", () => {
    connections.get(uid)?.delete(socket);
    if (connections.get(uid)?.size === 0) connections.delete(uid);
  });
});

// ── List conversations ────────────────────────────────────────────────────────
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
    .order("created_at", { ascending: false });

  if (error) return reply.code(500).send({ error: error.message });

  // Mark as read
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("from_user_id", uid)
    .is("read_at", null);

  return reply.send({ messages: data, page: +page });
});

// ── Start a conversation ──────────────────────────────────────────────────────
app.post("/messages/conversations", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { recipientId, initialMessage } = request.body as {
    recipientId: string;
    initialMessage: string;
  };

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant_a.eq.${uid},participant_b.eq.${recipientId}),and(participant_a.eq.${recipientId},participant_b.eq.${uid})`,
    )
    .single();

  let conversationId = existing?.id;

  if (!conversationId) {
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ participant_a: uid, participant_b: recipientId })
      .select("id")
      .single();
    if (error) return reply.code(500).send({ error: error.message });
    conversationId = newConv.id;
  }

  // Send initial message
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

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Push to recipient via WebSocket if connected
  const recipientSockets = connections.get(recipientId);
  if (recipientSockets) {
    const payload = JSON.stringify({ type: "new_message", message: msg, conversationId });
    recipientSockets.forEach((ws) => ws.send(payload));
  }

  return reply.code(201).send({ conversationId, message: msg });
});

// ── Send message ──────────────────────────────────────────────────────────────
const SendBody = z.object({ text: z.string().min(1) });

app.post("/messages/conversations/:id/send", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };
  const body = SendBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

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

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  // Get the other participant and push via WebSocket
  const { data: conv } = await supabase
    .from("conversations")
    .select("participant_a,participant_b")
    .eq("id", id)
    .single();
  const recipientId = conv?.participant_a === uid ? conv?.participant_b : conv?.participant_a;
  if (recipientId) {
    connections
      .get(recipientId)
      ?.forEach((ws) =>
        ws.send(JSON.stringify({ type: "new_message", message: msg, conversationId: id })),
      );
  }

  return reply.code(201).send(msg);
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Messaging Service running on port ${PORT}`);
});
