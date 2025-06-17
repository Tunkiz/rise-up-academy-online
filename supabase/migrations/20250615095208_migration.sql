
-- Drop the existing function to allow for signature change
DROP FUNCTION IF EXISTS public.get_all_users();

-- Add a function to suspend or unsuspend a user
CREATE OR REPLACE FUNCTION public.manage_user_suspension(
    target_user_id uuid,
    action text -- 'suspend' or 'unsuspend'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ban_until_timestamp timestamptz;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    IF auth.uid() = target_user_id THEN
        RAISE EXCEPTION 'Admins cannot perform this action on themselves.';
    END IF;

    IF action = 'suspend' THEN
        -- Sets a permanent suspension.
        ban_until_timestamp := 'infinity';
    ELSIF action = 'unsuspend' THEN
        -- Sets the ban date to the past, effectively un-banning the user.
        ban_until_timestamp := '1970-01-01T00:00:00Z';
    ELSE
        RAISE EXCEPTION 'Invalid action. Must be ''suspend'' or ''unsuspend''.';
    END IF;

    -- This update requires elevated privileges, which SECURITY DEFINER provides.
    UPDATE auth.users
    SET banned_until = ban_until_timestamp
    WHERE id = target_user_id;
END;
$$;

-- Recreate the get_all_users function to return suspension status
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    role public.app_role,
    created_at timestamptz,
    banned_until timestamptz
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
        u.email::text,
        ur.role,
        u.created_at,
        u.banned_until
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    ORDER BY u.created_at DESC;
END;
$$;
