-- =============================================================================
-- Migration: Public platform stats RPC
-- =============================================================================
-- All SELECT policies require auth.uid() IS NOT NULL (migration 20260513000003),
-- so unauthenticated visitors on public marketing pages get 0 for all counts.
-- This SECURITY DEFINER function runs as the function owner (bypasses RLS) and
-- returns only aggregate numbers — no rows, no PII exposed.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_talent          bigint;
  v_companies       bigint;
  v_open_jobs       bigint;
  v_open_challenges bigint;
  v_closed_challenges bigint;
  v_skills          bigint;
BEGIN
  SELECT COUNT(*) INTO v_talent      FROM public.profiles WHERE account_type = 'talent';
  SELECT COUNT(*) INTO v_companies   FROM public.profiles WHERE account_type = 'company';
  SELECT COUNT(*) INTO v_open_jobs   FROM public.jobs       WHERE status = 'open';
  SELECT COUNT(*) INTO v_open_challenges   FROM public.challenges WHERE status = 'open';
  SELECT COUNT(*) INTO v_closed_challenges FROM public.challenges WHERE status != 'open';
  SELECT COUNT(*) INTO v_skills      FROM public.skills;

  RETURN json_build_object(
    'talentCount',           v_talent,
    'companyCount',          v_companies,
    'openJobsCount',         v_open_jobs,
    'openChallengesCount',   v_open_challenges,
    'closedChallengesCount', v_closed_challenges,
    'totalSkillsCount',      v_skills
  );
END;
$$;

-- Allow any visitor (including anon) to call this function.
-- It only returns aggregate counts, never individual rows.
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;

-- =============================================================================
-- get_featured_talent: returns one sanitised talent profile for the landing page
-- =============================================================================
-- Selects the most complete talent profile that has both headline and bio set.
-- Returns only public-safe fields — no phone_number, no social_handle.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_featured_talent()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile  public.profiles%ROWTYPE;
  v_skills   json;
  v_pcount   bigint;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE account_type = 'talent'
    AND bio      IS NOT NULL AND bio      <> ''
    AND headline IS NOT NULL AND headline <> ''
  ORDER BY completeness_pct DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT json_agg(json_build_object('name', name, 'level', level))
  INTO v_skills
  FROM (SELECT name, level FROM public.skills WHERE profile_id = v_profile.id LIMIT 5) s;

  SELECT COUNT(*) INTO v_pcount FROM public.portfolio_items WHERE profile_id = v_profile.id;

  RETURN json_build_object(
    'id',              v_profile.id,
    'display_name',    v_profile.display_name,
    'headline',        v_profile.headline,
    'bio',             v_profile.bio,
    'avatar_url',      v_profile.avatar_url,
    'challenge_wins',  v_profile.challenge_wins,
    'portfolio_count', v_pcount,
    'skills',          COALESCE(v_skills, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_featured_talent() TO anon, authenticated;
