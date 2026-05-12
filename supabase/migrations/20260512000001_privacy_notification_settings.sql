-- =============================================================================
-- Migration: add privacy & notification preference columns to profiles
-- =============================================================================

ALTER TABLE public.profiles
  -- Privacy settings
  ADD COLUMN IF NOT EXISTS profile_visibility  text NOT NULL DEFAULT 'companies'
    CHECK (profile_visibility IN ('anyone', 'companies', 'invited')),
  ADD COLUMN IF NOT EXISTS show_location       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_messages      text NOT NULL DEFAULT 'companies'
    CHECK (allow_messages IN ('anyone', 'companies', 'none')),
  ADD COLUMN IF NOT EXISTS blind_mode          boolean NOT NULL DEFAULT false,

  -- Notification preferences
  ADD COLUMN IF NOT EXISTS notif_new_match           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_application_update  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_challenge_result    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_message             boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_weekly_digest       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_marketing           boolean NOT NULL DEFAULT false;

-- Security-definer function so a user can delete their own auth.users row,
-- which cascades to profiles and all child tables.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Only the authenticated user themselves should be able to call this.
REVOKE EXECUTE ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
