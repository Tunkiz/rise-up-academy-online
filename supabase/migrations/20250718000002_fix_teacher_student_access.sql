-- Fix teacher access to student details
-- Allow teachers and tutors to view student profiles for students in their subjects

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
    current_user_role public.app_role;
    target_tenant_id UUID;
    current_tenant_id UUID;
    is_teacher_student BOOLEAN := FALSE;
BEGIN
    -- Get current user's role
    SELECT ur.role INTO current_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();

    -- Check if user has permission
    IF current_user_role IS NULL OR current_user_role NOT IN ('admin', 'teacher', 'tutor') THEN
        RAISE EXCEPTION 'Only admins, teachers, and tutors can access this function.';
    END IF;

    -- Get tenant information
    SELECT p.tenant_id INTO target_tenant_id
    FROM public.profiles p
    WHERE p.id = p_user_id;

    SELECT public.get_current_tenant_id() INTO current_tenant_id;

    -- Super admins can view any user's details
    IF public.is_super_admin() THEN
        -- Super admin access - no restrictions
    ELSIF current_user_role = 'admin' THEN
        -- Tenant admins can view users in their tenant
        IF target_tenant_id != current_tenant_id THEN
            RAISE EXCEPTION 'You can only view users in your organization.';
        END IF;
    ELSIF current_user_role IN ('teacher', 'tutor') THEN
        -- Teachers and tutors can only view students in their subjects within their tenant
        IF target_tenant_id != current_tenant_id THEN
            RAISE EXCEPTION 'You can only view users in your organization.';
        END IF;

        -- Check if the target user is a student enrolled in teacher's subjects
        SELECT EXISTS (
            SELECT 1
            FROM public.user_subjects us
            JOIN public.subjects s ON us.subject_id = s.id
            JOIN public.user_subjects teacher_subjects ON teacher_subjects.subject_id = s.id
            WHERE us.user_id = p_user_id 
            AND teacher_subjects.user_id = auth.uid()
        ) INTO is_teacher_student;

        -- Also allow viewing their own profile
        IF p_user_id != auth.uid() AND NOT is_teacher_student THEN
            RAISE EXCEPTION 'You can only view students enrolled in your subjects.';
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
