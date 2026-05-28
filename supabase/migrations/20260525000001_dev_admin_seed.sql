-- =============================================================================
-- Dev: Create admin user and role for local development
-- Run this in Supabase SQL editor. For production, use proper user management.
-- =============================================================================

-- 1. Create a dev admin user (if one doesn't exist)
-- Using raw SQL instead of auth.admin.createUser to work in SQL editor
-- Note: In production, always use auth.admin.createUser via service role

-- First check if admin exists by email
DO $$
DECLARE
  admin_user_id UUID;
  existing_role UUID;
BEGIN
  -- Since we can't access auth.users directly in most SQL contexts,
  -- we'll create the role for the first user or use a known test user ID

  -- If you have a specific user ID to make admin, replace this with that UUID
  -- Example: SET admin_user_id = 'your-user-uuid-here';

  -- For dev testing, we'll output instructions
  RAISE NOTICE 'To create an admin:';
  RAISE NOTICE '1. Sign up a user via the app at /auth/signup';
  RAISE NOTICE '2. Copy their user ID from auth.users table';
  RAISE NOTICE '3. Run: INSERT INTO user_roles (user_id, role) VALUES (''<user-id>'', ''admin'') ON CONFLICT DO NOTHING;';
END $$;

-- 2. To manually assign admin role to an existing user, run:
--    Replace <user-id-here> with actual UUID from auth.users
--    (Find it in Supabase Dashboard > Authentication > Users)
--
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('<user-id-here>', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- 2b. Quick dev helper: Create admin for first talent user (for local testing)
DO $$
DECLARE
  first_talent_id UUID;
BEGIN
  SELECT id INTO first_talent_id
  FROM profiles
  WHERE account_type = 'talent'
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_talent_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (first_talent_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE 'Admin role added to first talent user: %', first_talent_id;
  ELSE
    RAISE NOTICE 'No talent users found. Sign up first.';
  END IF;
END $$;

-- 3. Verify the has_role function exists and works
-- SELECT public.has_role('<user-id-here>', 'admin');

-- 4. To list all users with admin role:
-- SELECT ur.user_id, p.display_name, ur.created_at
-- FROM user_roles ur
-- JOIN profiles p ON p.id = ur.user_id
-- WHERE ur.role = 'admin';