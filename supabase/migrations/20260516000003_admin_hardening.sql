-- =============================================================================
-- Admin RLS hardening + profile view self-view prevention
-- 1. submissions SELECT — add admin bypass
-- 2. profile_views INSERT — prevent self-view inflation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. submissions SELECT — include admin read access
-- Admins need to view all submissions for moderation. Existing policy covers
-- talent (own) and company (their challenge). Add admin bypass.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "submissions_select" ON public.submissions;
CREATE POLICY "submissions_select" ON public.submissions
  FOR SELECT USING (
    talent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id AND c.company_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- ---------------------------------------------------------------------------
-- 2. profile_views INSERT — prevent self-view inflation
-- Require authentication and disallow inserting views of one's own profile.
-- viewer_id must match auth.uid() (no impersonation) and profile_id must
-- differ from the viewer so self-views don't inflate counts.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profile_views_insert" ON public.profile_views;
CREATE POLICY "profile_views_insert" ON public.profile_views
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND profile_id != auth.uid()
    AND (viewer_id = auth.uid() OR viewer_id IS NULL)
  );
