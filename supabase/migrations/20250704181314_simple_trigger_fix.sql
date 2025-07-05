-- ============================================================================
-- SIMPLE TRIGGER FIX - Only create trigger with explicit schema references
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS auth_user_login_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_login();

-- Create the trigger function with explicit schema references
CREATE OR REPLACE FUNCTION public.handle_auth_user_login()
RETURNS TRIGGER AS $$
DECLARE
    admin_name TEXT;
    admin_avatar TEXT;
BEGIN
  BEGIN
    -- Extract name from user metadata
    admin_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    );
    
    -- Extract avatar URL from user metadata
    admin_avatar := COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    );
    
    -- Create admin user record in public.admin_users table
    INSERT INTO public.admin_users (
      id,
      email,
      name,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      admin_name,
      admin_avatar,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
      
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error details for debugging
      RAISE LOG 'Error creating admin user for %: %', NEW.email, SQLERRM;
      -- Don't break authentication flow
      NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
CREATE TRIGGER auth_user_login_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_login();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT, INSERT, UPDATE ON auth.users TO service_role;
GRANT ALL ON public.admin_users TO service_role;

-- Also grant to authenticated users for completeness
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON public.admin_users TO authenticated;
