-- Fix the ambiguous column reference in get_teacher_students function
CREATE OR REPLACE FUNCTION public.get_teacher_students()
RETURNS TABLE(
    id uuid,
    full_name text,
    email text,
    role app_role,
    created_at timestamp with time zone,
    banned_until timestamp with time zone,
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
    current_tenant_id uuid;
BEGIN
    -- Get current tenant ID
    current_tenant_id := public.get_current_tenant_id();
    
    -- Only teachers and tutors can access this function
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND user_roles.role IN ('teacher', 'tutor')
    ) THEN
        RAISE EXCEPTION 'Only teachers and tutors can access this function.';
    END IF;

    -- Get all subjects in the current tenant (for now, teachers can see all subjects)
    -- In the future, this could be filtered to only subjects assigned to the teacher
    RETURN QUERY
    SELECT DISTINCT
        u.id,
        p.full_name,
        u.email::text,
        ur.role AS user_role,
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
            AND s.tenant_id = current_tenant_id
        ) AS subjects,
        t.name AS tenant_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    LEFT JOIN public.tenants t ON p.tenant_id = t.id
    WHERE p.tenant_id = current_tenant_id
    AND ur.role = 'student'
    AND EXISTS (
        SELECT 1 FROM public.user_subjects us
        JOIN public.subjects s ON us.subject_id = s.id
        WHERE us.user_id = u.id
        AND s.tenant_id = current_tenant_id
    )
    ORDER BY u.created_at DESC;
END;
$$;