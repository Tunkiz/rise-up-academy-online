-- Fix teacher-student relationships by ensuring students are enrolled in teacher's subjects
-- This migration ensures that the existing student (John Doe) is properly enrolled in subjects that teachers can manage

DO $$
DECLARE
    teacher_user_id UUID;
    student_user_id UUID;
    accounting_subject_id UUID;
    current_tenant UUID;
BEGIN
    -- Get the current tenant
    SELECT id INTO current_tenant FROM public.tenants LIMIT 1;
    
    -- Find a teacher user (assuming there's at least one teacher)
    SELECT ur.user_id INTO teacher_user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('teacher', 'tutor')
    LIMIT 1;
    
    -- Find a student user (John Doe or any student)
    SELECT ur.user_id INTO student_user_id
    FROM public.user_roles ur
    WHERE ur.role = 'student'
    LIMIT 1;
    
    -- Find or create an Accounting subject
    SELECT id INTO accounting_subject_id
    FROM public.subjects
    WHERE name = 'Accounting'
    LIMIT 1;
    
    -- If no Accounting subject exists, create one
    IF accounting_subject_id IS NULL THEN
        INSERT INTO public.subjects (name, category, class_time, teams_link, tenant_id)
        VALUES ('Accounting', 'matric_amended', '10:00', 'https://teams.microsoft.com/accounting', current_tenant)
        RETURNING id INTO accounting_subject_id;
    END IF;
    
    -- If we have both teacher and student, ensure they're connected through the subject
    IF teacher_user_id IS NOT NULL AND student_user_id IS NOT NULL AND accounting_subject_id IS NOT NULL THEN
        -- Enroll the teacher in the Accounting subject (if not already enrolled)
        INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
        VALUES (teacher_user_id, accounting_subject_id, current_tenant)
        ON CONFLICT (user_id, subject_id) DO NOTHING;
        
        -- Enroll the student in the Accounting subject (if not already enrolled)
        INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
        VALUES (student_user_id, accounting_subject_id, current_tenant)
        ON CONFLICT (user_id, subject_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Teacher-student relationship established for subject: Accounting';
END $$;

-- Also ensure that the get_teacher_students function works correctly
-- and that teachers can see students enrolled in their subjects
DROP FUNCTION IF EXISTS public.get_teacher_students();

CREATE OR REPLACE FUNCTION public.get_teacher_students()
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
                    'name', s.name,
                    'category', s.category
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
$$;
