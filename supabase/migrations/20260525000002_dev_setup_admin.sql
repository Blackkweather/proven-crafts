// =============================================================================
// Dev: Admin setup script for local development
// Run this in Supabase SQL Editor BEFORE trying to access /admin
// =============================================================================

-- Step 1: Ensure the admin role type exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('talent', 'company', 'admin');
  END IF;
END $$;

-- Step 2: Create a dev admin user (replace with your email)
-- You must sign up first via the app, OR use this to create a test user:

-- Option A: If you already signed up via /auth/signup:
-- Get your user ID from: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- Then assign admin: INSERT INTO user_roles (user_id, role) VALUES ('your-uuid', 'admin');

-- Option B: Create admin for the first user in the system (quick dev setup):
DO $$
DECLARE
  first_user_id UUID;
BEGIN
  SELECT id INTO first_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_user_id IS NOT NULL THEN
    -- Insert admin role
    INSERT INTO user_roles (user_id, role)
    VALUES (first_user_id, 'admin')
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';

    -- Update profile for admin
    INSERT INTO profiles (id, display_name, account_type, headline)
    VALUES (first_user_id, 'Dev Admin', 'talent', 'System Administrator')
    ON CONFLICT (id) DO UPDATE SET headline = 'System Administrator';

    RAISE NOTICE '✅ Admin setup complete for user: %', first_user_id;
  ELSE
    RAISE NOTICE '⚠️ No users found. Please sign up first at /auth/signup';
  END IF;
END $$;

-- Step 3: Verify admin setup
SELECT 
  p.id,
  p.display_name,
  p.email,
  ur.role
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
WHERE ur.role = 'admin';

-- =============================================================================
-- AFTER RUNNING THIS:
-- 1. Start the dev server: npm run dev
-- 2. Go to http://localhost:5173/auth/signin  
-- 3. Sign in with the user that now has admin role
-- 4. Navigate to http://localhost:5173/admin
-- =============================================================================