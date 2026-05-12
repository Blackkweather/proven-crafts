/**
 * storage.ts — File upload helpers using Supabase Storage.
 * All functions validate file size, upload to the correct bucket, and return
 * the URL to persist in the database.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const PORTFOLIO_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const SUBMISSION_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const SIGNED_URL_DEFAULT_TTL = 3600; // seconds

const ALLOWED_AVATAR_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_PORTFOLIO_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_PORTFOLIO_MIME_EXACT = ["application/pdf"];
const ALLOWED_SUBMISSION_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_SUBMISSION_MIME_EXACT = ["application/pdf", "application/zip", "text/plain"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExtension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
}

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function validateSize(file: File, maxBytes: number, label: string): void {
  if (file.size > maxBytes) {
    const maxMB = maxBytes / 1024 / 1024;
    throw new Error(
      `${label} files must be smaller than ${maxMB} MB. "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
    );
  }
}

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
 * Returns the public URL (no expiry needed — bucket is public).
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
 * Returns a signed URL valid for 1 hour (caller should persist the path,
 * not the signed URL, and re-sign on demand via `getSignedUrl`).
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

const VIDEO_INTRO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_VIDEO_INTRO_MIME_PREFIXES = ["video/"];
// Fresh signed URL lasts 1 hour — re-generated on every page load from the stored path
const VIDEO_INTRO_SIGNED_TTL = 3600;

/**
 * Upload a video intro to the private `portfolio` bucket.
 * Path: `video-intros/{userId}/{timestamp}-{sanitised-filename}`
 * Returns the storage PATH (not a signed URL) — store this in DB and
 * call `getVideoIntroSignedUrl(path)` on each page load.
 */
export async function uploadVideoIntro(userId: string, file: File): Promise<string> {
  validateSize(file, VIDEO_INTRO_MAX_BYTES, "Video intro");
  validateMimeType(file, [], ALLOWED_VIDEO_INTRO_MIME_PREFIXES, "Video intro");

  const timestamp = Date.now();
  const safeName = sanitiseFilename(file.name);
  const path = `video-intros/${userId}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("portfolio")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(`Video intro upload failed: ${uploadError.message}`);
  }

  return path;
}

/**
 * Generate a fresh 1-hour signed URL from a stored video intro path.
 * Call this on every page load — never persist the returned URL.
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
 * Store the storage path in the DB, not this URL — re-sign on each page load.
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
