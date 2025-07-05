-- ============================================================================
-- FIX EXISTING USERS MIGRATION
-- ============================================================================
-- This migration creates admin_users records for existing auth.users who don't have them.
-- This is needed because the trigger only fires on NEW inserts, not existing users.

-- Create admin_users records for all existing auth.users who don't have them
INSERT INTO admin_users (
    id,
    email,
    name,
    avatar_url,
    created_at,
    updated_at
)
SELECT DISTINCT
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)
    ) as name,
    COALESCE(
        u.raw_user_meta_data->>'avatar_url',
        u.raw_user_meta_data->>'picture'
    ) as avatar_url,
    NOW() as created_at,
    NOW() as updated_at
FROM auth.users u
LEFT JOIN admin_users a ON u.id = a.id
WHERE a.id IS NULL  -- Only create for users who don't have admin records
  AND u.email IS NOT NULL  -- Only create for users with emails
  AND u.email NOT LIKE '%@test.com'  -- Skip test users
  AND u.email NOT LIKE '%@example.com';  -- Skip example users

-- Log the operation
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Created admin_users records for % existing auth.users', affected_count;
END $$;
