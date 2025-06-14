
-- First, let's update the user roles to match your plan.
-- We'll replace the generic 'user' role with more specific roles like 'learner', 'tutor', and 'parent'.

-- 1. Rename the old enum type
ALTER TYPE public.app_role RENAME TO __app_role_old;

-- 2. Create the new enum type with the required roles
CREATE TYPE public.app_role AS ENUM ('admin', 'learner', 'tutor', 'parent');

-- 3. Update the user_roles table to use the new enum type.
-- This will also convert any existing 'user' roles to 'learner'.
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING
    CASE (role::text)
      WHEN 'user' THEN 'learner'::public.app_role
      ELSE role::text::public.app_role
    END;

-- 4. Drop the old enum type
DROP TYPE public.__app_role_old;

-- Second, to securely fetch user data for the admin panel,
-- we'll create a database function that returns all users with their roles and emails.
-- This function can only be called by an admin.

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    role public.app_role,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email,
        ur.role,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    ORDER BY u.created_at DESC;
END;
$$;
