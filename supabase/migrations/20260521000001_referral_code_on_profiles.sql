-- Add referral_code column to profiles.
-- Each user gets a unique 8-character code auto-generated on insert.
-- Backfill uses a prefix of the user's own UUID (deterministic and unique).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT UPPER(REPLACE(SUBSTRING(gen_random_uuid()::text, 1, 8), '-', ''));

UPDATE public.profiles
  SET referral_code = UPPER(REPLACE(SUBSTRING(id::text, 1, 8), '-', ''))
  WHERE referral_code IS NULL;

-- Index for fast lookup by code (invite link resolution)
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON public.profiles (referral_code);
