// =============================================================================
// index.ts — services/storage-service/src/index.ts
// =============================================================================
// Storage Service — handles file uploads via Supabase Storage.
//
// Endpoints:
//   POST   /storage/avatar          — upload profile avatar
//   POST   /storage/portfolio       — upload a portfolio item file
//   POST   /storage/submission      — upload a challenge submission file
//   DELETE /storage/:bucket/:path   — delete a file
//   GET    /health
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { createClient } from "@supabase/supabase-js";

const PORT = parseInt(process.env.PORT ?? "3010");

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB max

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf", "application/zip", "text/plain"];

app.get("/health", async () => ({ status: "ok", service: "storage-service" }));

// ── Upload avatar ─────────────────────────────────────────────────────────────

/**
 * Upload a profile avatar to the `avatars` bucket.
 * File is stored at `<userId>/avatar.<ext>` so it overwrites on re-upload.
 * AUTH: user can only upload their own avatar
 * DATABASE: updates `profiles.avatar_url` after successful upload
 */
app.post("/storage/avatar", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const data = await request.file();
  if (!data) return reply.code(400).send({ error: "No file provided" });
  if (!ALLOWED_IMAGE_TYPES.includes(data.mimetype))
    return reply.code(400).send({ error: "Only image files allowed" });

  const ext = data.filename.split(".").pop() ?? "jpg";
  const path = `${uid}/avatar.${ext}`;
  const buffer = await data.toBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: data.mimetype, upsert: true });

  if (uploadError) return reply.code(500).send({ error: uploadError.message });

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", uid);

  return reply.send({ url: urlData.publicUrl });
});

// ── Upload portfolio item ─────────────────────────────────────────────────────

/**
 * Upload a portfolio file to the `portfolio` bucket.
 * AUTH: user can only upload to their own portfolio
 * DATABASE: inserts a record into `portfolio_items`
 */
app.post("/storage/portfolio", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const data = await request.file();
  if (!data) return reply.code(400).send({ error: "No file provided" });
  if (!ALLOWED_FILE_TYPES.includes(data.mimetype))
    return reply.code(400).send({ error: "File type not allowed" });

  const path = `${uid}/${Date.now()}-${data.filename}`;
  const buffer = await data.toBuffer();

  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(path, buffer, { contentType: data.mimetype });

  if (uploadError) return reply.code(500).send({ error: uploadError.message });

  const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);

  return reply.code(201).send({ url: urlData.publicUrl, path });
});

// ── Upload submission file ────────────────────────────────────────────────────

/**
 * Upload a file attachment for a challenge submission.
 * AUTH: talent only
 * DATABASE: file URL is returned for the caller to attach to a submission record
 */
app.post("/storage/submission", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const data = await request.file();
  if (!data) return reply.code(400).send({ error: "No file provided" });
  if (!ALLOWED_FILE_TYPES.includes(data.mimetype))
    return reply.code(400).send({ error: "File type not allowed" });

  const path = `${uid}/${Date.now()}-${data.filename}`;
  const buffer = await data.toBuffer();

  const { error: uploadError } = await supabase.storage
    .from("submissions")
    .upload(path, buffer, { contentType: data.mimetype });

  if (uploadError) return reply.code(500).send({ error: uploadError.message });

  const { data: urlData } = supabase.storage.from("submissions").getPublicUrl(path);

  return reply.code(201).send({ url: urlData.publicUrl, path });
});

// ── Delete file ───────────────────────────────────────────────────────────────

/**
 * Delete a file from a Supabase Storage bucket.
 * AUTH: user can only delete files under their own user ID path
 */
app.delete("/storage/:bucket/:path", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const { bucket, path } = request.params as { bucket: string; path: string };

  // Security: path must start with the user's own ID
  if (!path.startsWith(uid))
    return reply.code(403).send({ error: "Can only delete your own files" });

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) return reply.code(500).send({ error: error.message });

  return reply.send({ success: true });
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`Storage Service running on port ${PORT}`);
});
