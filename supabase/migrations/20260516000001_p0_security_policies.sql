-- =============================================================================
-- P0 Security Policies
-- 1. Match UPDATE policy for talent (accept/decline invites)
-- 2. create_notification SECURITY DEFINER RPC (replaces direct INSERT)
-- 3. Revert has_role to SECURITY DEFINER (removes recursive RLS risk)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Match UPDATE — talent side
-- Talent needs to accept/decline match invites. The existing policy only
-- allows company_id = auth.uid(). Add a parallel policy for talent_id.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "matches_update_talent" ON public.matches;
CREATE POLICY "matches_update_talent" ON public.matches
  FOR UPDATE
  USING (talent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. create_notification — SECURITY DEFINER RPC
-- Replaces direct client INSERT into notifications (which has no INSERT RLS).
-- Validates caller, recipient, kind, and content length before inserting.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id  uuid,
  p_kind     text,
  p_title    text,
  p_body     text,
  p_link     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_kind NOT IN ('match', 'application', 'message', 'challenge') THEN
    RAISE EXCEPTION 'Invalid notification kind: %', p_kind;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  IF char_length(p_title) > 200 OR char_length(p_body) > 1000 THEN
    RAISE EXCEPTION 'Notification content exceeds maximum length';
  END IF;

  -- Reject non-http(s) links
  IF p_link IS NOT NULL AND p_link !~ '^https?://' THEN
    RAISE EXCEPTION 'Invalid link scheme';
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  VALUES (p_user_id, p_kind, p_title, p_body, p_link);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Revert has_role to SECURITY DEFINER
-- Migration 20260509000758 changed this to SECURITY INVOKER, creating a
-- fragile recursive RLS evaluation path. SECURITY DEFINER is correct here
-- because the function only returns a boolean and cannot escalate privileges.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
