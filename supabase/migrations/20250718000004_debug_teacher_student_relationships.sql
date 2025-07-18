-- Debug migration to check teacher-student relationships
-- This will help us understand why the teacher can't access student details

DO $$
DECLARE
    teacher_count INTEGER;
    student_count INTEGER;
    teacher_subjects_count INTEGER;
    student_subjects_count INTEGER;
    common_subjects_count INTEGER;
    current_tenant UUID;
BEGIN
    -- Get current tenant
    SELECT id INTO current_tenant FROM public.tenants LIMIT 1;
    
    -- Count teachers
    SELECT COUNT(*) INTO teacher_count
    FROM public.user_roles ur
    WHERE ur.role IN ('teacher', 'tutor');
    
    -- Count students
    SELECT COUNT(*) INTO student_count
    FROM public.user_roles ur
    WHERE ur.role = 'student';
    
    -- Count teacher subjects
    SELECT COUNT(*) INTO teacher_subjects_count
    FROM public.user_subjects us
    JOIN public.user_roles ur ON us.user_id = ur.user_id
    WHERE ur.role IN ('teacher', 'tutor');
    
    -- Count student subjects
    SELECT COUNT(*) INTO student_subjects_count
    FROM public.user_subjects us
    JOIN public.user_roles ur ON us.user_id = ur.user_id
    WHERE ur.role = 'student';
    
    -- Count common subjects between teachers and students
    SELECT COUNT(DISTINCT s.id) INTO common_subjects_count
    FROM public.subjects s
    JOIN public.user_subjects teacher_us ON s.id = teacher_us.subject_id
    JOIN public.user_subjects student_us ON s.id = student_us.subject_id
    JOIN public.user_roles teacher_ur ON teacher_us.user_id = teacher_ur.user_id
    JOIN public.user_roles student_ur ON student_us.user_id = student_ur.user_id
    WHERE teacher_ur.role IN ('teacher', 'tutor')
    AND student_ur.role = 'student';
    
    RAISE NOTICE 'Debug Info:';
    RAISE NOTICE 'Teachers: %, Students: %', teacher_count, student_count;
    RAISE NOTICE 'Teacher Subjects: %, Student Subjects: %', teacher_subjects_count, student_subjects_count;
    RAISE NOTICE 'Common Subjects: %', common_subjects_count;
    RAISE NOTICE 'Current Tenant: %', current_tenant;
END $$;

-- Also let's create a simpler version of get_user_details with better debugging
CREATE OR REPLACE FUNCTION public.get_user_details_debug(p_user_id uuid)
RETURNS TABLE (
    debug_info text,
    user_found boolean,
    current_user_role text,
    target_user_role text,
    same_tenant boolean,
    is_teacher_student boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role public.app_role;
    target_user_role public.app_role;
    target_tenant_id UUID;
    current_tenant_id UUID;
    is_teacher_student_result BOOLEAN := FALSE;
    user_exists BOOLEAN := FALSE;
BEGIN
    -- Check if target user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;
    
    -- Get current user's role
    SELECT ur.role INTO current_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();

    -- Get target user's role
    SELECT ur.role INTO target_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id;

    -- Get tenant information
    SELECT p.tenant_id INTO target_tenant_id
    FROM public.profiles p
    WHERE p.id = p_user_id;

    SELECT public.get_current_tenant_id() INTO current_tenant_id;

    -- Check if the target user is a student enrolled in teacher's subjects
    IF current_user_role IN ('teacher', 'tutor') THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_subjects us
            JOIN public.subjects s ON us.subject_id = s.id
            JOIN public.user_subjects teacher_subjects ON teacher_subjects.subject_id = s.id
            WHERE us.user_id = p_user_id 
            AND teacher_subjects.user_id = auth.uid()
        ) INTO is_teacher_student_result;
    END IF;

    RETURN QUERY
    SELECT
        format('Current User: %s, Target User: %s, Tenants: %s/%s', 
               auth.uid()::text, p_user_id::text, current_tenant_id::text, target_tenant_id::text) as debug_info,
        user_exists,
        current_user_role::text,
        target_user_role::text,
        (target_tenant_id = current_tenant_id),
        is_teacher_student_result;
END;
$$;
