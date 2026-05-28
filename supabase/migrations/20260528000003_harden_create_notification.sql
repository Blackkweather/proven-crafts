-- Add sender_id to notifications for audit trail and rate limiting
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Harden create_notification RPC:
--   1. Records sender_id = auth.uid() (cannot be spoofed by callers)
--   2. Relationship gate: caller must share a conversation, application, or match
--      with the recipient — prevents sending notifications to arbitrary users
--   3. Rate limit: 20 notifications per sender per minute to prevent spam
--   4. Fix link validation: was rejecting relative paths (/app/inbox?conv=...)
--      which caused all linked notifications to silently fail
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_kind    text,
  p_title   text,
  p_body    text,
  p_link    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender uuid := auth.uid();
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_kind NOT IN ('match', 'application', 'message', 'challenge') THEN
    RAISE EXCEPTION 'Invalid notification kind';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  IF char_length(p_title) > 200 OR char_length(p_body) > 1000 THEN
    RAISE EXCEPTION 'Content too long';
  END IF;

  -- Accept relative paths (/...) or https:// URLs only
  IF p_link IS NOT NULL AND p_link !~ '^/' AND p_link !~ '^https://' THEN
    RAISE EXCEPTION 'Invalid link';
  END IF;

  -- Rate limit: 20 notifications per sender per minute
  IF (
    SELECT COUNT(*) FROM public.notifications
    WHERE sender_id = v_sender
      AND created_at > now() - interval '1 minute'
  ) >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;

  -- Relationship gate: sender must share a conversation, application, or match
  -- with the recipient. Self-notifications (sender = recipient) are always allowed.
  IF v_sender <> p_user_id THEN
    IF NOT (
      EXISTS (
        SELECT 1 FROM public.conversations
        WHERE (participant_a = v_sender AND participant_b = p_user_id)
           OR (participant_a = p_user_id AND participant_b = v_sender)
      )
      OR EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE (a.talent_id = v_sender AND j.company_id = p_user_id)
           OR (a.talent_id = p_user_id AND j.company_id = v_sender)
      )
      OR EXISTS (
        SELECT 1 FROM public.matches
        WHERE (company_id = v_sender AND talent_id = p_user_id)
           OR (company_id = p_user_id AND talent_id = v_sender)
      )
    ) THEN
      RAISE EXCEPTION 'No relationship with recipient';
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, sender_id, kind, title, body, link)
  VALUES (p_user_id, v_sender, p_kind, p_title, p_body, p_link);
END;
$$;
