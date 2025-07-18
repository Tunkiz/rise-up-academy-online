-- Fix the get_user_details function with improved teacher-student relationship check
-- The issue might be in the complex JOIN logic

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
    target_user_role public.app_role;
BEGIN
    -- Get current user's role
    SELECT ur.role INTO current_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();

    -- Check if user has permission
    IF current_user_role IS NULL OR current_user_role NOT IN ('admin', 'teacher', 'tutor') THEN
        RAISE EXCEPTION 'Only admins, teachers, and tutors can access this function.';
    END IF;

    -- Get target user's role
    SELECT ur.role INTO target_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id;

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

        -- Allow viewing their own profile
        IF p_user_id = auth.uid() THEN
            is_teacher_student := TRUE;
        -- For other users, check if they are students in teacher's subjects
        ELSIF target_user_role = 'student' THEN
            -- Simplified check: find common subjects between teacher and student
            SELECT EXISTS (
                SELECT 1
                FROM public.user_subjects teacher_us
                JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
                WHERE teacher_us.user_id = auth.uid()
                AND student_us.user_id = p_user_id
            ) INTO is_teacher_student;
        END IF;

        -- If not their own profile and not a student in their subjects, deny access
        IF NOT is_teacher_student THEN
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
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.name,
                    'category', s.category
                )
            )
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
