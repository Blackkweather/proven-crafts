-- =============================================================================
-- Store video intro storage path separately from the signed URL.
-- Signed URLs expire; the path is permanent and lets us re-sign on demand.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS video_intro_path text;

-- Back-fill: existing rows with a video_intro_url keep their URL in the
-- old column. New uploads will populate video_intro_path instead.
-- The application layer will prefer video_intro_path when present.
