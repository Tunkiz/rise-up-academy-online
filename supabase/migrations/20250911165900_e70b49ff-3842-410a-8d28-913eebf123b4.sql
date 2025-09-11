-- Fix get_teacher_students function to remove reference to non-existent s.category column
-- The subjects table doesn't have a category column, categories are in subject_categories table

CREATE OR REPLACE FUNCTION public.get_teacher_students()
RETURNS TABLE(id uuid, full_name text, email text, role app_role, created_at timestamp with time zone, banned_until timestamp with time zone, avatar_url text, grade integer, subjects jsonb, tenant_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    current_user_role public.app_role;
    current_tenant_id UUID;
BEGIN
    -- Get current user's role
    SELECT ur.role INTO current_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();

    -- Check if user is a teacher or tutor
    IF current_user_role NOT IN ('teacher', 'tutor') THEN
        RAISE EXCEPTION 'Only teachers and tutors can access this function.';
    END IF;

    -- Get current tenant
    SELECT public.get_current_tenant_id() INTO current_tenant_id;

    RETURN QUERY
    SELECT DISTINCT
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
                    'name', s.name
                )
            )
            FROM public.user_subjects us2
            JOIN public.subjects s ON us2.subject_id = s.id
            WHERE us2.user_id = u.id
        ) AS subjects,
        t.name AS tenant_name
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    JOIN public.user_roles ur ON u.id = ur.user_id
    JOIN public.user_subjects student_subjects ON student_subjects.user_id = u.id
    JOIN public.user_subjects teacher_subjects ON teacher_subjects.subject_id = student_subjects.subject_id
    LEFT JOIN public.tenants t ON p.tenant_id = t.id
    WHERE ur.role = 'student'
    AND teacher_subjects.user_id = auth.uid()
    AND p.tenant_id = current_tenant_id
    ORDER BY p.full_name;
END;
$function$