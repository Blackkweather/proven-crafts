-- ---------------------------------------------------------------------------
-- Require authentication for all SELECT policies that previously used USING (true).
-- Unauthenticated visitors can no longer browse profiles, skills, portfolios,
-- jobs, challenges, hiring steps, or leaderboard entries.
-- ---------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "profiles_select_all"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- skills
DROP POLICY IF EXISTS "skills_select_all" ON public.skills;
CREATE POLICY "skills_select_auth" ON public.skills
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- portfolio_items
DROP POLICY IF EXISTS "portfolio_select_all" ON public.portfolio_items;
CREATE POLICY "portfolio_select_auth" ON public.portfolio_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- company_hiring_steps
DROP POLICY IF EXISTS "hiring_steps_select_all" ON public.company_hiring_steps;
CREATE POLICY "hiring_steps_select_auth" ON public.company_hiring_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- jobs
DROP POLICY IF EXISTS "jobs_select_all" ON public.jobs;
CREATE POLICY "jobs_select_auth" ON public.jobs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- challenges
DROP POLICY IF EXISTS "challenges_select_all" ON public.challenges;
CREATE POLICY "challenges_select_auth" ON public.challenges
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- leaderboard_entries
DROP POLICY IF EXISTS "leaderboard_select_all" ON public.leaderboard_entries;
CREATE POLICY "leaderboard_select_auth" ON public.leaderboard_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- market_rates (reference data — keep public, it has no PII)
-- Left as-is intentionally.
