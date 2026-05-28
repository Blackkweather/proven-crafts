-- =============================================================================
-- RLS Role Hardening
-- Addresses six privilege-escalation gaps where any authenticated user could
-- perform role-specific actions (e.g. talent posting jobs, company submitting
-- to challenges) because INSERT policies only checked ownership, not role.
-- Also restricts phone_number / social_handle to confirmed-match access only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Jobs INSERT — company role required
-- Previously: any auth user could insert a job with company_id = auth.uid().
-- Now: the inserting user must also hold the 'company' role.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "jobs_insert_own" ON public.jobs;
CREATE POLICY "jobs_insert_own" ON public.jobs
  FOR INSERT WITH CHECK (
    company_id = auth.uid()
    AND public.has_role(auth.uid(), 'company')
  );

-- ---------------------------------------------------------------------------
-- 2. Challenges INSERT — company role required
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "challenges_insert_own" ON public.challenges;
CREATE POLICY "challenges_insert_own" ON public.challenges
  FOR INSERT WITH CHECK (
    company_id = auth.uid()
    AND public.has_role(auth.uid(), 'company')
  );

-- ---------------------------------------------------------------------------
-- 3. Matches INSERT — company role required
-- Only companies can initiate match invitations.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "matches_insert" ON public.matches;
CREATE POLICY "matches_insert" ON public.matches
  FOR INSERT WITH CHECK (
    company_id = auth.uid()
    AND public.has_role(auth.uid(), 'company')
  );

-- ---------------------------------------------------------------------------
-- 4. Submissions INSERT — talent role required
-- Previously: any auth user (including companies) could submit to challenges.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "submissions_insert" ON public.submissions;
CREATE POLICY "submissions_insert" ON public.submissions
  FOR INSERT WITH CHECK (
    talent_id = auth.uid()
    AND public.has_role(auth.uid(), 'talent')
  );

-- ---------------------------------------------------------------------------
-- 5. Applications INSERT — talent role required
-- Previously: any auth user (including companies) could apply to jobs.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "applications_insert" ON public.applications;
CREATE POLICY "applications_insert" ON public.applications
  FOR INSERT WITH CHECK (
    talent_id = auth.uid()
    AND public.has_role(auth.uid(), 'talent')
  );

-- ---------------------------------------------------------------------------
-- 6. Candidate votes INSERT — must own the job the application belongs to
-- Previously: voter_id = auth.uid() with no ownership check meant any auth
-- user who knew an application UUID could insert a vote.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "votes_insert" ON public.candidate_votes;
CREATE POLICY "votes_insert" ON public.candidate_votes
  FOR INSERT WITH CHECK (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id
        AND j.company_id = auth.uid()
    )
  );

-- votes UPDATE — same ownership requirement
DROP POLICY IF EXISTS "votes_update" ON public.candidate_votes;
CREATE POLICY "votes_update" ON public.candidate_votes
  FOR UPDATE USING (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id
        AND j.company_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Candidate notes INSERT — must own the job the application belongs to
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notes_insert" ON public.candidate_notes;
CREATE POLICY "notes_insert" ON public.candidate_notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_id
        AND j.company_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Phone / social handle column-level security
-- These fields are marked "privacy-restricted: only visible to confirmed match
-- partner" in the schema. The row-level SELECT policy grants any authenticated
-- user access to the full profiles row, leaking PII. Fix by revoking SELECT on
-- these two columns from the authenticated role. PostgREST will then omit them
-- from all direct profile queries. The existing get_contact_info(uuid) function
-- (SECURITY DEFINER, checks confirmed match) remains the only access path.
-- ---------------------------------------------------------------------------
REVOKE SELECT (phone_number, social_handle) ON public.profiles FROM authenticated;

-- ---------------------------------------------------------------------------
-- 9. Drop auto_confirm_user trigger if it was ever created outside migrations.
-- This trigger bypassed email verification by setting email_confirmed_at on
-- every new signup. If it does not exist, this is a safe no-op.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS auto_confirm_user ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user();
