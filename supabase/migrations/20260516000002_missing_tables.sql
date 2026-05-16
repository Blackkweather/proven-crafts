-- =============================================================================
-- Missing tables required by application code
-- Creates: admin_audit_log, talent_shortlists, contact_submissions, referrals
-- Creates views: referral_stats, challenge_analytics
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. admin_audit_log
-- Immutable log of all admin actions. INSERT by admins only, no UPDATE/DELETE.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  target_type text        NOT NULL,
  target_id   uuid,
  details     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_admin_id_idx  ON public.admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_insert_admin" ON public.admin_audit_log
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND admin_id = auth.uid()
  );

CREATE POLICY "audit_log_select_admin" ON public.admin_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 2. talent_shortlists
-- Company saves talent profiles for later. Company-owned; talent can see if
-- they appear in any shortlist (useful for analytics / "who saved me").
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_shortlists (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  talent_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, talent_id)
);

CREATE INDEX IF NOT EXISTS talent_shortlists_company_id_idx ON public.talent_shortlists (company_id);
CREATE INDEX IF NOT EXISTS talent_shortlists_talent_id_idx  ON public.talent_shortlists (talent_id);

ALTER TABLE public.talent_shortlists ENABLE ROW LEVEL SECURITY;

-- Company manages their own shortlist
CREATE POLICY "shortlists_company_all" ON public.talent_shortlists
  FOR ALL USING (company_id = auth.uid());

-- Talent can see which companies have shortlisted them
CREATE POLICY "shortlists_talent_select" ON public.talent_shortlists
  FOR SELECT USING (talent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. contact_submissions
-- Public contact form; anyone can submit, only admins can read.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  email       text        NOT NULL,
  company     text,
  topic       text        NOT NULL,
  message     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx ON public.contact_submissions (created_at DESC);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) can submit the contact form
CREATE POLICY "contact_submissions_insert_public" ON public.contact_submissions
  FOR INSERT WITH CHECK (true);

-- Only admins can read submissions
CREATE POLICY "contact_submissions_select_admin" ON public.contact_submissions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Anon role needs explicit INSERT grant for public contact form
GRANT INSERT ON public.contact_submissions TO anon;

-- ---------------------------------------------------------------------------
-- 4. referrals
-- Tracks who referred whom via referral codes on profiles.
-- The referred user (who just signed up) creates the record.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code              text        NOT NULL UNIQUE,
  referred_user_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  converted_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx      ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_user_id_idx ON public.referrals (referred_user_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx             ON public.referrals (code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- The newly referred user creates their own referral record
CREATE POLICY "referrals_insert" ON public.referrals
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND referred_user_id = auth.uid()
  );

-- Both referrer and referred can see the record
CREATE POLICY "referrals_select_own" ON public.referrals
  FOR SELECT USING (
    referrer_id = auth.uid()
    OR referred_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 5. referral_stats VIEW
-- Aggregates referral counts per referrer for the dashboard stats widget.
-- SECURITY INVOKER (default) — caller's RLS on referrals applies.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.referral_stats AS
  SELECT
    referrer_id,
    COUNT(*)::integer                                              AS total_referrals,
    COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::integer     AS converted_referrals
  FROM public.referrals
  GROUP BY referrer_id;

GRANT SELECT ON public.referral_stats TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. challenge_analytics VIEW
-- Per-challenge submission metrics for the company analytics page.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.challenge_analytics AS
  SELECT
    c.id                                                                   AS challenge_id,
    c.company_id,
    c.title,
    c.status,
    c.created_at,
    c.deadline_at,
    COUNT(s.id)                                                            AS total_submissions,
    COUNT(s.id) FILTER (WHERE s.status IN ('reviewed', 'shortlisted'))    AS reviewed_submissions,
    AVG(s.match_score)                                                     AS avg_match_score,
    MIN(s.created_at)                                                      AS first_submission_at,
    EXTRACT(EPOCH FROM (MIN(s.created_at) - c.created_at)) / 3600.0       AS hours_to_first_submission
  FROM public.challenges c
  LEFT JOIN public.submissions s ON s.challenge_id = c.id
  GROUP BY c.id, c.company_id, c.title, c.status, c.created_at, c.deadline_at;

GRANT SELECT ON public.challenge_analytics TO authenticated;
