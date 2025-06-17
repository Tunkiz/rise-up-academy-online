
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
        u.email::text, -- This line is fixed
        ur.role,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    ORDER BY u.created_at DESC;
END;
$$;
