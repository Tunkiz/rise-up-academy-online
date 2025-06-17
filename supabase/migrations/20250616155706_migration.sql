
-- Drop and recreate get_user_details function to include tenant_name
DROP FUNCTION IF EXISTS public.get_user_details(uuid);

CREATE OR REPLACE FUNCTION public.get_user_details(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    role public.app_role,
    created_at timestamptz,
    banned_until timestamptz,
    avatar_url text,
    grade integer,
    subjects jsonb,
    tenant_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_tenant_id UUID;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    -- Get the target user's tenant_id
    SELECT p.tenant_id INTO target_tenant_id
    FROM public.profiles p
    WHERE p.id = p_user_id;

    -- Super admins can view any user's details
    -- Tenant admins can only view users within their own tenant
    IF NOT public.is_super_admin() THEN
        IF target_tenant_id != public.get_current_tenant_id() THEN
            RAISE EXCEPTION 'You can only view users in your organization.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email::text,
        ur.role,
        u.created_at,
        u.banned_until,
        p.avatar_url,
        p.grade,
        (
            SELECT jsonb_agg(s.*)
            FROM public.user_subjects us
            JOIN public.subjects s ON us.subject_id = s.id
            WHERE us.user_id = u.id
        ) AS subjects,
        t.name AS tenant_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    LEFT JOIN public.tenants t ON p.tenant_id = t.id
    WHERE u.id = p_user_id;
END;
$$;
