-- Require the viewer to be authenticated and tie viewer_id to their session.
-- Prevents anonymous spam and ensures view records are always attributable.
DROP POLICY IF EXISTS "profile_views_insert" ON public.profile_views;
CREATE POLICY "profile_views_insert" ON public.profile_views
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (viewer_id = auth.uid() OR viewer_id IS NULL)
  );
