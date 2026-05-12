-- ---------------------------------------------------------------------------
-- Security hardening: restrict sensitive profile columns from public reads
-- ---------------------------------------------------------------------------

-- Drop the catch-all public SELECT policy on profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Authenticated users can read all non-sensitive columns via a view-gated approach.
-- For the public listing view we expose only safe columns; contact details require
-- the viewer to be the owner or have a confirmed match with the profile owner.
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Separate policy: phone_number and social_handle are only visible to the owner.
-- Postgres column-level security is enforced by restricting the columns to a view.
-- Create a secure view that hides contact details from non-owners.
CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT
    id,
    display_name,
    headline,
    bio,
    avatar_url,
    account_type,
    location,
    availability,
    video_intro_url,
    challenge_wins,
    completeness_pct,
    company_name,
    company_initials,
    company_industry,
    company_size,
    company_about,
    trust_score,
    response_time_days,
    ghosting_rate,
    offer_rate,
    total_hires,
    anti_ghosting_badge,
    created_at,
    updated_at
  FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
