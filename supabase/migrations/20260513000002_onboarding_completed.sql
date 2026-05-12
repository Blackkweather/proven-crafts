-- =============================================================================
-- Replace localStorage-based onboarding flag with a DB column.
-- This makes onboarding state consistent across devices and browsers.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
