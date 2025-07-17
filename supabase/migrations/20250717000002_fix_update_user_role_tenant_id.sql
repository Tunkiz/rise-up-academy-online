-- Fix update_user_role function to include tenant_id when updating user roles
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id uuid,
    new_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_tenant_id uuid;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    -- Get the tenant_id for the target user
    SELECT tenant_id INTO target_tenant_id 
    FROM public.profiles 
    WHERE id = target_user_id;

    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found or tenant_id is null';
    END IF;

    -- This function enforces a single role per user, which aligns with the current UI.
    -- It first removes any existing roles for the user, then inserts the new role.
    -- This handles both cases: assigning a role for the first time, and changing an existing role.

    -- First, remove all existing role assignments for the user to ensure a clean slate.
    DELETE FROM public.user_roles WHERE user_id = target_user_id;

    -- Then, insert the new role for the user with the correct tenant_id.
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (target_user_id, new_role, target_tenant_id);
END;
$$;

-- Update get_user_details function to allow teachers and tutors to access user details
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
    -- Allow admins, teachers, and tutors to access this function
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'teacher', 'tutor')
    ) THEN
        RAISE EXCEPTION 'Only admins, teachers, and tutors can access this function.';
    END IF;

    -- Get the target user's tenant_id
    SELECT p.tenant_id INTO target_tenant_id
    FROM public.profiles p
    WHERE p.id = p_user_id;

    -- Super admins can view any user's details
    -- Tenant admins, teachers, and tutors can only view users within their own tenant
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
