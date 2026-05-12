-- =============================================================================
-- Skill Network V2 — Migration 001: Full Schema
-- Run this against your Supabase project SQL editor or via supabase db push.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Utility: updated_at trigger function (reused by many tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Extend existing `profiles` table
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location            text         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS availability        text         NOT NULL DEFAULT 'exploring'
    CHECK (availability IN ('open','exploring','booked')),
  ADD COLUMN IF NOT EXISTS video_intro_url     text,
  ADD COLUMN IF NOT EXISTS challenge_wins      integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completeness_pct    integer      NOT NULL DEFAULT 0,
  -- privacy-restricted: only visible to confirmed match partner
  ADD COLUMN IF NOT EXISTS phone_number        text,
  ADD COLUMN IF NOT EXISTS social_handle       text,
  -- company-specific fields
  ADD COLUMN IF NOT EXISTS company_name        text,
  ADD COLUMN IF NOT EXISTS company_initials    text,
  ADD COLUMN IF NOT EXISTS company_industry    text,
  ADD COLUMN IF NOT EXISTS company_size        text,
  ADD COLUMN IF NOT EXISTS company_about       text,
  -- trust / reputation signals
  ADD COLUMN IF NOT EXISTS trust_score         integer,
  ADD COLUMN IF NOT EXISTS response_time_days  numeric(4,1),
  ADD COLUMN IF NOT EXISTS ghosting_rate       numeric(4,1),
  ADD COLUMN IF NOT EXISTS offer_rate          integer,
  ADD COLUMN IF NOT EXISTS total_hires         integer      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anti_ghosting_badge boolean      NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. Skills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skills (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  level       text        NOT NULL CHECK (level IN ('foundational','proficient','advanced','expert')),
  verified_by text        CHECK (verified_by IN ('challenge','portfolio','reference')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, name)
);

-- ---------------------------------------------------------------------------
-- 3. Portfolio items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  type        text        NOT NULL CHECK (type IN ('project','video','writing','submission')),
  summary     text        NOT NULL DEFAULT '',
  url         text,
  tags        text[]      NOT NULL DEFAULT '{}',
  year        integer     NOT NULL,
  pinned      boolean     NOT NULL DEFAULT false,
  cover_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Company hiring steps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_hiring_steps (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_order  integer NOT NULL,
  label       text    NOT NULL,
  description text    NOT NULL DEFAULT '',
  duration    text    NOT NULL DEFAULT '',
  paid        boolean NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------------
-- 5. Jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  location        text        NOT NULL DEFAULT '',
  arrangement     text        NOT NULL DEFAULT 'Remote' CHECK (arrangement IN ('Remote','Hybrid','Onsite')),
  comp            text        NOT NULL DEFAULT '',
  required_skills text[]      NOT NULL DEFAULT '{}',
  summary         text        NOT NULL DEFAULT '',
  applicants      integer     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenges (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  brief             text        NOT NULL DEFAULT '',
  deadline_at       timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  required_skills   text[]      NOT NULL DEFAULT '{}',
  submissions_count integer     NOT NULL DEFAULT 0,
  prize             text,
  status            text        NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  talent_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','shortlisted')),
  work_url     text,
  writeup      text,
  file_urls    text[]      NOT NULL DEFAULT '{}',
  match_score  integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, talent_id)
);

CREATE OR REPLACE TRIGGER submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep submissions_count in sync
CREATE OR REPLACE FUNCTION public.sync_submissions_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenges SET submissions_count = submissions_count + 1 WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenges SET submissions_count = GREATEST(submissions_count - 1, 0) WHERE id = OLD.challenge_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER submissions_count_sync
  AFTER INSERT OR DELETE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_submissions_count();

-- ---------------------------------------------------------------------------
-- 8. Applications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                   uuid        NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  talent_id                uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                   text        NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','interview','offer','rejected')),
  match_score              integer     NOT NULL DEFAULT 0,
  message                  text,
  challenge_submission_id  uuid        REFERENCES public.submissions(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, talent_id)
);

CREATE OR REPLACE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep jobs.applicants in sync
CREATE OR REPLACE FUNCTION public.sync_applicants_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jobs SET applicants = applicants + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.jobs SET applicants = GREATEST(applicants - 1, 0) WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER applicants_count_sync
  AFTER INSERT OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.sync_applicants_count();

-- ---------------------------------------------------------------------------
-- 9. Matches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  talent_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, talent_id)
);

CREATE OR REPLACE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Conversations & Messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body             text        NOT NULL,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Keep conversations.last_message_at in sync
CREATE OR REPLACE FUNCTION public.sync_last_message_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER messages_last_message_at
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sync_last_message_at();

-- ---------------------------------------------------------------------------
-- 11. Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        text        NOT NULL CHECK (kind IN ('match','application','message','challenge')),
  title       text        NOT NULL,
  body        text        NOT NULL DEFAULT '',
  link        text,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 12. Candidate votes & notes (collaborative hiring)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_votes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  voter_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voter_name      text        NOT NULL,
  vote            text        NOT NULL CHECK (vote IN ('yes','no','maybe')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, voter_id)
);

CREATE OR REPLACE TRIGGER candidate_votes_updated_at
  BEFORE UPDATE ON public.candidate_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.candidate_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name     text        NOT NULL,
  body            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 13. Leaderboard
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id uuid        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  rank         integer     NOT NULL,
  score        integer     NOT NULL,
  badge        text        CHECK (badge IN ('gold','silver','bronze')),
  highlight    text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, talent_id)
);

-- ---------------------------------------------------------------------------
-- 14. Market rates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_rates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  skill      text        NOT NULL,
  location   text        NOT NULL,
  p25        integer     NOT NULL,
  median     integer     NOT NULL,
  p75        integer     NOT NULL,
  currency   text        NOT NULL DEFAULT 'EUR',
  trend      text        NOT NULL DEFAULT 'flat' CHECK (trend IN ('up','flat','down')),
  delta      integer     NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 15. Profile views
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_views (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 16. Privacy helper function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_contact_info(subject_id uuid)
RETURNS TABLE(phone_number text, social_handle text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.matches
    WHERE status = 'confirmed'
      AND (
        (company_id = auth.uid() AND talent_id = subject_id)
        OR (talent_id = auth.uid() AND company_id = subject_id)
      )
  ) THEN
    RETURN QUERY
      SELECT p.phone_number, p.social_handle
      FROM public.profiles p
      WHERE p.id = subject_id;
  ELSE
    RETURN QUERY SELECT NULL::text, NULL::text;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 17. Auth hook: auto-create profile + role on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'account_type')::account_type, 'talent')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'account_type')::app_role, 'talent')
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 18. Row Level Security
-- ---------------------------------------------------------------------------

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "skills_select_all"  ON public.skills;
DROP POLICY IF EXISTS "skills_insert_own"  ON public.skills;
DROP POLICY IF EXISTS "skills_update_own"  ON public.skills;
DROP POLICY IF EXISTS "skills_delete_own"  ON public.skills;

CREATE POLICY "skills_select_all" ON public.skills FOR SELECT USING (true);
CREATE POLICY "skills_insert_own" ON public.skills FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "skills_update_own" ON public.skills FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "skills_delete_own" ON public.skills FOR DELETE USING (profile_id = auth.uid());

-- portfolio_items
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portfolio_select_all"  ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_insert_own"  ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_update_own"  ON public.portfolio_items;
DROP POLICY IF EXISTS "portfolio_delete_own"  ON public.portfolio_items;

CREATE POLICY "portfolio_select_all" ON public.portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_insert_own" ON public.portfolio_items FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "portfolio_update_own" ON public.portfolio_items FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "portfolio_delete_own" ON public.portfolio_items FOR DELETE USING (profile_id = auth.uid());

-- company_hiring_steps
ALTER TABLE public.company_hiring_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hiring_steps_select_all"  ON public.company_hiring_steps;
DROP POLICY IF EXISTS "hiring_steps_insert_own"  ON public.company_hiring_steps;
DROP POLICY IF EXISTS "hiring_steps_update_own"  ON public.company_hiring_steps;
DROP POLICY IF EXISTS "hiring_steps_delete_own"  ON public.company_hiring_steps;

CREATE POLICY "hiring_steps_select_all" ON public.company_hiring_steps FOR SELECT USING (true);
CREATE POLICY "hiring_steps_insert_own" ON public.company_hiring_steps FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "hiring_steps_update_own" ON public.company_hiring_steps FOR UPDATE USING (company_id = auth.uid());
CREATE POLICY "hiring_steps_delete_own" ON public.company_hiring_steps FOR DELETE USING (company_id = auth.uid());

-- jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jobs_select_all"    ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_own"    ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_own"    ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_own"    ON public.jobs;

CREATE POLICY "jobs_select_all" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "jobs_insert_own" ON public.jobs FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "jobs_update_own" ON public.jobs FOR UPDATE USING (company_id = auth.uid());
CREATE POLICY "jobs_delete_own" ON public.jobs FOR DELETE USING (company_id = auth.uid());

-- challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges_select_all"  ON public.challenges;
DROP POLICY IF EXISTS "challenges_insert_own"  ON public.challenges;
DROP POLICY IF EXISTS "challenges_update_own"  ON public.challenges;
DROP POLICY IF EXISTS "challenges_delete_own"  ON public.challenges;

CREATE POLICY "challenges_select_all" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert_own" ON public.challenges FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "challenges_update_own" ON public.challenges FOR UPDATE USING (company_id = auth.uid());
CREATE POLICY "challenges_delete_own" ON public.challenges FOR DELETE USING (company_id = auth.uid());

-- submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions_select"  ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert"  ON public.submissions;
DROP POLICY IF EXISTS "submissions_update"  ON public.submissions;

-- talent sees own; company sees submissions for their challenges
CREATE POLICY "submissions_select" ON public.submissions FOR SELECT USING (
  talent_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_id AND c.company_id = auth.uid()
  )
);
CREATE POLICY "submissions_insert" ON public.submissions FOR INSERT WITH CHECK (talent_id = auth.uid());
CREATE POLICY "submissions_update" ON public.submissions FOR UPDATE USING (talent_id = auth.uid());

-- applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "applications_select"  ON public.applications;
DROP POLICY IF EXISTS "applications_insert"  ON public.applications;
DROP POLICY IF EXISTS "applications_update"  ON public.applications;

CREATE POLICY "applications_select" ON public.applications FOR SELECT USING (
  talent_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.company_id = auth.uid()
  )
);
CREATE POLICY "applications_insert" ON public.applications FOR INSERT WITH CHECK (talent_id = auth.uid());
CREATE POLICY "applications_update" ON public.applications FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id AND j.company_id = auth.uid()
  )
);

-- matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matches_select"  ON public.matches;
DROP POLICY IF EXISTS "matches_insert"  ON public.matches;
DROP POLICY IF EXISTS "matches_update"  ON public.matches;

CREATE POLICY "matches_select" ON public.matches FOR SELECT USING (
  company_id = auth.uid() OR talent_id = auth.uid()
);
CREATE POLICY "matches_insert" ON public.matches FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "matches_update" ON public.matches FOR UPDATE USING (company_id = auth.uid());

-- conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select"  ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert"  ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (
  participant_a = auth.uid() OR participant_b = auth.uid()
);
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK (
  participant_a = auth.uid() OR participant_b = auth.uid()
);

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select"  ON public.messages;
DROP POLICY IF EXISTS "messages_insert"  ON public.messages;

CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
  )
);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own"  ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
-- INSERT is via service role only (no client-side policy needed; service_role bypasses RLS)

-- candidate_votes
ALTER TABLE public.candidate_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_select"  ON public.candidate_votes;
DROP POLICY IF EXISTS "votes_insert"  ON public.candidate_votes;
DROP POLICY IF EXISTS "votes_update"  ON public.candidate_votes;

CREATE POLICY "votes_select" ON public.candidate_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = application_id AND j.company_id = auth.uid()
  )
);
CREATE POLICY "votes_insert" ON public.candidate_votes FOR INSERT WITH CHECK (voter_id = auth.uid());
CREATE POLICY "votes_update" ON public.candidate_votes FOR UPDATE USING (voter_id = auth.uid());

-- candidate_notes
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notes_select"  ON public.candidate_notes;
DROP POLICY IF EXISTS "notes_insert"  ON public.candidate_notes;

CREATE POLICY "notes_select" ON public.candidate_notes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = application_id AND j.company_id = auth.uid()
  )
);
CREATE POLICY "notes_insert" ON public.candidate_notes FOR INSERT WITH CHECK (author_id = auth.uid());

-- leaderboard_entries
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leaderboard_select_all"  ON public.leaderboard_entries;

CREATE POLICY "leaderboard_select_all" ON public.leaderboard_entries FOR SELECT USING (true);
-- INSERT/UPDATE by service role only

-- market_rates
ALTER TABLE public.market_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_rates_select_all"  ON public.market_rates;

CREATE POLICY "market_rates_select_all" ON public.market_rates FOR SELECT USING (true);
-- INSERT/UPDATE by service role / admin only

-- profile_views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_views_insert"  ON public.profile_views;
DROP POLICY IF EXISTS "profile_views_select_own"  ON public.profile_views;

CREATE POLICY "profile_views_insert" ON public.profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "profile_views_select_own" ON public.profile_views FOR SELECT USING (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 19. Storage buckets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars',     'avatars',     true),
  ('portfolio',   'portfolio',   false),
  ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: avatars (public read, owner write)
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: portfolio (owner read/write; company read on confirmed match)
DROP POLICY IF EXISTS "portfolio_owner_all"     ON storage.objects;
DROP POLICY IF EXISTS "portfolio_match_read"    ON storage.objects;

CREATE POLICY "portfolio_owner_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "portfolio_match_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'portfolio'
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.status = 'confirmed'
        AND m.company_id = auth.uid()
        AND m.talent_id::text = (storage.foldername(name))[1]
    )
  );

-- Storage RLS: submissions (talent write own; company read for their challenges)
DROP POLICY IF EXISTS "submissions_talent_insert" ON storage.objects;
DROP POLICY IF EXISTS "submissions_talent_read"   ON storage.objects;
DROP POLICY IF EXISTS "submissions_company_read"  ON storage.objects;

CREATE POLICY "submissions_talent_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "submissions_talent_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "submissions_company_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.challenges c ON c.id = s.challenge_id
      WHERE c.company_id = auth.uid()
        AND s.talent_id::text = (storage.foldername(name))[1]
    )
  );

-- ---------------------------------------------------------------------------
-- 20. Seed data: market rates (static reference data)
-- ---------------------------------------------------------------------------
INSERT INTO public.market_rates (skill, location, p25, median, p75, currency, trend, delta) VALUES
  ('React',            'Remote',         55000, 72000,  90000, 'EUR', 'up',   8),
  ('React',            'Berlin',         60000, 78000,  95000, 'EUR', 'up',   5),
  ('React',            'Amsterdam',      65000, 82000, 100000, 'EUR', 'up',   6),
  ('TypeScript',       'Remote',         58000, 75000,  92000, 'EUR', 'up',   10),
  ('TypeScript',       'Berlin',         62000, 80000,  98000, 'EUR', 'up',   7),
  ('Node.js',          'Remote',         52000, 68000,  85000, 'EUR', 'flat', 1),
  ('Node.js',          'Berlin',         57000, 73000,  90000, 'EUR', 'flat', 0),
  ('Python',           'Remote',         54000, 70000,  88000, 'EUR', 'up',   4),
  ('Python',           'Berlin',         58000, 76000,  94000, 'EUR', 'up',   3),
  ('Product Design',   'Remote',         50000, 65000,  82000, 'EUR', 'up',   6),
  ('Product Design',   'Berlin',         54000, 70000,  88000, 'EUR', 'up',   5),
  ('Data Science',     'Remote',         60000, 78000,  98000, 'EUR', 'up',   12),
  ('Data Science',     'Berlin',         64000, 84000, 105000, 'EUR', 'up',   9),
  ('DevOps',           'Remote',         58000, 75000,  95000, 'EUR', 'flat', 2),
  ('DevOps',           'Berlin',         62000, 80000, 100000, 'EUR', 'flat', 1),
  ('Go',               'Remote',         60000, 78000,  98000, 'EUR', 'up',   8),
  ('Rust',             'Remote',         62000, 82000, 105000, 'EUR', 'up',   15),
  ('iOS Development',  'Remote',         55000, 72000,  92000, 'EUR', 'flat', 0),
  ('Android',          'Remote',         53000, 70000,  90000, 'EUR', 'down', -2),
  ('GraphQL',          'Remote',         56000, 73000,  91000, 'EUR', 'flat', 1),
  ('PostgreSQL',       'Remote',         52000, 67000,  84000, 'EUR', 'flat', 0),
  ('UX Research',      'Remote',         46000, 60000,  76000, 'EUR', 'up',   5)
ON CONFLICT DO NOTHING;
