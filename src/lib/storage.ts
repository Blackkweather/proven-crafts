// =============================================================================
// storage.ts — src/lib/storage.ts
// =============================================================================
// File upload helpers that use Supabase Storage. Every function validates
// the file's size and MIME type before uploading, then returns either a public
// URL (for avatars) or a short-lived signed URL (for private portfolio/submission
// files). Store the storage PATH in the database — not the signed URL — and
// re-sign on each page load.
//
// This file is the only place in the frontend that talks to Supabase Storage,
// keeping upload logic centralised and easy to audit.
//
// KEYWORDS: VALIDATION, API
// =============================================================================

/**
 * storage.ts — File upload helpers using Supabase Storage.
 * All functions validate file size, upload to the correct bucket, and return
 * the URL to persist in the database.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Maximum allowed file sizes — enforced before upload to give users a clear error
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const PORTFOLIO_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const SUBMISSION_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// How long signed URLs are valid for in seconds (1 hour = 3600 s)
// Signed URLs expire for security — they can't be shared indefinitely
const SIGNED_URL_DEFAULT_TTL = 3600; // seconds

// Allowed MIME types per upload category.
// We use exact matches for common types and prefix matches for broad categories.
const ALLOWED_AVATAR_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_PORTFOLIO_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_PORTFOLIO_MIME_EXACT = ["application/pdf"];
const ALLOWED_SUBMISSION_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_SUBMISSION_MIME_EXACT = ["application/pdf", "application/zip", "text/plain"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the lowercase file extension from a File object.
 * Falls back to "bin" if the filename has no extension.
 */
function getExtension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
}

/**
 * Sanitise a filename by replacing any character that isn't alphanumeric,
 * a dot, a hyphen, or an underscore with an underscore.
 * This prevents path traversal issues and keeps storage paths clean.
 */
function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * VALIDATION: throw a clear error if a file exceeds the allowed size.
 * Doing this client-side gives the user immediate feedback without a wasted upload.
 */
function validateSize(file: File, maxBytes: number, label: string): void {
  if (file.size > maxBytes) {
    const maxMB = maxBytes / 1024 / 1024;
    throw new Error(
      `${label} files must be smaller than ${maxMB} MB. "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
    );
  }
}

/**
 * VALIDATION: throw a clear error if the file's MIME type is not in the allowed list.
 * Checks both exact matches (e.g., "application/pdf") and prefix matches (e.g., "image/").
 * Without this, users could attempt to upload executable files or other unsafe types.
 */
function validateMimeType(file: File, exact: string[], prefixes: string[], label: string): void {
  const type = file.type.toLowerCase();
  const allowed = exact.includes(type) || prefixes.some((p) => type.startsWith(p));
  if (!allowed) {
    throw new Error(
      `${label} files must be a supported type. "${file.name}" has type "${file.type || "unknown"}".`,
    );
  }
}

// ---------------------------------------------------------------------------
// Avatar upload
// ---------------------------------------------------------------------------

/**
 * Upload a user's avatar to the public `avatars` bucket.
 * Path: `{userId}/avatar.{ext}`
 *
 * The `upsert: true` option replaces any existing avatar at the same path
 * so a user can update their photo without accumulating old files.
 *
 * VALIDATION: checks file size (5 MB max) and MIME type (JPEG/PNG/WebP/GIF only).
 * API: uploads to Supabase Storage `avatars` bucket.
 * Returns the public URL (no expiry needed — the `avatars` bucket is public).
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  validateSize(file, AVATAR_MAX_BYTES, "Avatar");
  validateMimeType(file, ALLOWED_AVATAR_MIME, [], "Avatar");

  const ext = getExtension(file);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(`Avatar upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Portfolio file upload
// ---------------------------------------------------------------------------

/**
 * Upload a portfolio asset to the private `portfolio` bucket.
 * Path: `{userId}/{timestamp}-{sanitised-filename}`
 *
 * The timestamp in the path makes each upload unique so files don't overwrite
 * each other if the user uploads two files with the same name.
 *
 * IMPORTANT: store the returned path (not the URL) in the DB and re-sign it
 * on demand using `getSignedUrl`. Signed URLs expire after 1 hour.
 *
 * VALIDATION: checks file size (25 MB max) and MIME type (images, videos, PDFs).
 * API: uploads to Supabase Storage `portfolio` bucket.
 * Returns a signed URL valid for 1 hour.
 */
export async function uploadPortfolioFile(userId: string, file: File): Promise<string> {
  validateSize(file, PORTFOLIO_MAX_BYTES, "Portfolio");
  validateMimeType(
    file,
    ALLOWED_PORTFOLIO_MIME_EXACT,
    ALLOWED_PORTFOLIO_MIME_PREFIXES,
    "Portfolio",
  );

  const timestamp = Date.now();
  const safeName = sanitiseFilename(file.name);
  const path = `${userId}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(`Portfolio upload failed: ${uploadError.message}`);
  }

  return getSignedUrl("portfolio", path);
}

// ---------------------------------------------------------------------------
// Submission file upload
// ---------------------------------------------------------------------------

/**
 * Upload a challenge submission file to the private `submissions` bucket.
 * Path: `{userId}/{challengeId}/{timestamp}-{sanitised-filename}`
 *
 * The challengeId in the path groups all files for a submission together,
 * making it easy to clean up when a submission is deleted.
 *
 * VALIDATION: checks file size (25 MB max) and MIME type (images, videos, PDFs, zip, text).
 * API: uploads to Supabase Storage `submissions` bucket.
 * Returns a signed URL valid for 1 hour.
 */
export async function uploadSubmissionFile(
  userId: string,
  challengeId: string,
  file: File,
): Promise<string> {
  validateSize(file, SUBMISSION_MAX_BYTES, "Submission");
  validateMimeType(
    file,
    ALLOWED_SUBMISSION_MIME_EXACT,
    ALLOWED_SUBMISSION_MIME_PREFIXES,
    "Submission",
  );

  const timestamp = Date.now();
  const safeName = sanitiseFilename(file.name);
  const path = `${userId}/${challengeId}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("submissions")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(`Submission upload failed: ${uploadError.message}`);
  }

  return getSignedUrl("submissions", path);
}

// ---------------------------------------------------------------------------
// Video intro upload
// ---------------------------------------------------------------------------

const VIDEO_INTRO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB — larger limit for video
const ALLOWED_VIDEO_INTRO_MIME_PREFIXES = ["video/"];
// Fresh signed URL lasts 1 hour — re-generated on every page load from the stored path
const VIDEO_INTRO_SIGNED_TTL = 3600;

/**
 * Upload a video intro to the private `portfolio` bucket.
 * Path: `video-intros/{userId}/{timestamp}-{sanitised-filename}`
 *
 * WHY return the path instead of a URL: signed URLs expire, so if we stored the
 * URL in the DB, the video would break after 1 hour. Instead we store the path
 * and call `getVideoIntroSignedUrl(path)` on each page load to get a fresh URL.
 *
 * VALIDATION: checks file size (100 MB max) and MIME type (any video/* type).
 * API: uploads to Supabase Storage `portfolio` bucket under `video-intros/`.
 * Returns the storage PATH (not a signed URL) — store this in DB.
 */
export async function uploadVideoIntro(userId: string, file: File): Promise<string> {
  validateSize(file, VIDEO_INTRO_MAX_BYTES, "Video intro");
  validateMimeType(file, [], ALLOWED_VIDEO_INTRO_MIME_PREFIXES, "Video intro");

  const timestamp = Date.now();
  const safeName = sanitiseFilename(file.name);
  const path = `${userId}/video-intros/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(`Video intro upload failed: ${uploadError.message}`);
  }

  return path; // Return path, NOT a signed URL
}

/**
 * Generate a fresh 1-hour signed URL from a stored video intro path.
 * Call this on every page load — never persist the returned URL to the DB.
 *
 * API: calls Supabase Storage `createSignedUrl` on the `portfolio` bucket.
 */
export async function getVideoIntroSignedUrl(path: string): Promise<string> {
  return getSignedUrl("portfolio", path, VIDEO_INTRO_SIGNED_TTL);
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Delete a file from a storage bucket.
 * `path` is the storage path returned at upload time (not the full URL).
 *
 * API: calls Supabase Storage `remove` on the given bucket and path.
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Failed to delete "${path}" from bucket "${bucket}": ${error.message}`);
  }
}

/**
 * Generate a signed URL for a private bucket object.
 * Default TTL is 3600 seconds (1 hour).
 *
 * WHY signed URLs: private buckets require authentication to access files.
 * A signed URL includes a time-limited token that lets a browser load the file
 * directly from Supabase CDN without going through our app server.
 *
 * Store the storage path in the DB, not this URL — re-sign on each page load.
 *
 * API: calls Supabase Storage `createSignedUrl` on the given bucket.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = SIGNED_URL_DEFAULT_TTL,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to create signed URL for "${path}" in bucket "${bucket}": ${error?.message ?? "unknown error"}`,
    );
  }

  return data.signedUrl;
}
