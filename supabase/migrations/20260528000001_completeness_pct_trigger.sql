-- =============================================================================
-- Migration: Auto-calculate completeness_pct on profiles
-- =============================================================================
-- completeness_pct was stored in the DB but never updated automatically.
-- This migration adds a function + triggers so it stays correct whenever
-- a talent's profile, skills, or portfolio items change.
--
-- Scoring (talent only — company profiles stay at 0):
--   display_name  filled         → 10 pts
--   headline      filled         → 10 pts
--   bio           filled         → 15 pts
--   avatar_url    set            → 10 pts
--   location      filled         → 5  pts
--   availability  != 'exploring' → 5  pts
--   skills        ≥ 1            → up to 20 pts (5 per skill, capped)
--   portfolio     ≥ 1            → up to 15 pts (5 per item, capped)
--   video_intro   set            → 10 pts
-- Max possible: 100 pts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Core calculation function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calculate_completeness(p_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile  public.profiles%ROWTYPE;
  v_skills   integer;
  v_portfolio integer;
  v_score    integer := 0;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Only calculate for talent accounts
  IF v_profile.account_type != 'talent' THEN RETURN 0; END IF;

  SELECT COUNT(*) INTO v_skills   FROM public.skills          WHERE profile_id = p_id;
  SELECT COUNT(*) INTO v_portfolio FROM public.portfolio_items WHERE profile_id = p_id;

  IF v_profile.display_name IS NOT NULL AND v_profile.display_name <> '' THEN v_score := v_score + 10; END IF;
  IF v_profile.headline      IS NOT NULL AND v_profile.headline      <> '' THEN v_score := v_score + 10; END IF;
  IF v_profile.bio           IS NOT NULL AND v_profile.bio           <> '' THEN v_score := v_score + 15; END IF;
  IF v_profile.avatar_url    IS NOT NULL AND v_profile.avatar_url    <> '' THEN v_score := v_score + 10; END IF;
  IF v_profile.location      IS NOT NULL AND v_profile.location      <> '' THEN v_score := v_score + 5;  END IF;
  IF v_profile.availability  IS NOT NULL AND v_profile.availability  <> 'exploring' THEN v_score := v_score + 5; END IF;
  v_score := v_score + LEAST(v_skills   * 5, 20);
  v_score := v_score + LEAST(v_portfolio * 5, 15);
  IF (v_profile.video_intro_path IS NOT NULL AND v_profile.video_intro_path <> '')
     OR (v_profile.video_intro_url IS NOT NULL AND v_profile.video_intro_url <> '')
  THEN v_score := v_score + 10; END IF;

  RETURN LEAST(v_score, 100);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Trigger function — updates the profile row with the new score
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_sync_completeness_from_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.completeness_pct := public.fn_calculate_completeness(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_completeness_from_related()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- For INSERT/UPDATE use NEW; for DELETE use OLD
  v_profile_id := COALESCE(NEW.profile_id, OLD.profile_id);
  UPDATE public.profiles
    SET completeness_pct = public.fn_calculate_completeness(v_profile_id)
  WHERE id = v_profile_id;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Trigger on profiles (fires before INSERT/UPDATE so NEW is updated in-place)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS profiles_sync_completeness ON public.profiles;
CREATE TRIGGER profiles_sync_completeness
  BEFORE INSERT OR UPDATE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_completeness_from_profile();

-- ---------------------------------------------------------------------------
-- 4. Triggers on skills and portfolio_items (after-row, updates parent profile)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS skills_sync_completeness ON public.skills;
CREATE TRIGGER skills_sync_completeness
  AFTER INSERT OR UPDATE OR DELETE
  ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_completeness_from_related();

DROP TRIGGER IF EXISTS portfolio_sync_completeness ON public.portfolio_items;
CREATE TRIGGER portfolio_sync_completeness
  AFTER INSERT OR UPDATE OR DELETE
  ON public.portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_completeness_from_related();

-- ---------------------------------------------------------------------------
-- 5. Back-fill all existing talent profiles
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET completeness_pct = public.fn_calculate_completeness(id)
WHERE account_type = 'talent';
