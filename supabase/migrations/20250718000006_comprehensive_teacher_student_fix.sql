-- Comprehensive fix for teacher-student relationships
-- This will ensure all existing users have proper subject enrollments

DO $$
DECLARE
    teacher_user_id UUID;
    student_user_id UUID;
    accounting_subject_id UUID;
    current_tenant UUID;
    teacher_count INTEGER;
    student_count INTEGER;
    relationship_count INTEGER;
BEGIN
    -- Get the current tenant
    SELECT id INTO current_tenant FROM public.tenants LIMIT 1;
    
    RAISE NOTICE 'Starting teacher-student relationship fix...';
    RAISE NOTICE 'Current tenant: %', current_tenant;
    
    -- Count existing users
    SELECT COUNT(*) INTO teacher_count FROM public.user_roles WHERE role IN ('teacher', 'tutor');
    SELECT COUNT(*) INTO student_count FROM public.user_roles WHERE role = 'student';
    
    RAISE NOTICE 'Found % teachers and % students', teacher_count, student_count;
    
    -- Find or create an Accounting subject
    SELECT id INTO accounting_subject_id
    FROM public.subjects
    WHERE name = 'Accounting' AND tenant_id = current_tenant
    LIMIT 1;
    
    -- If no Accounting subject exists, create one
    IF accounting_subject_id IS NULL THEN
        INSERT INTO public.subjects (name, category, class_time, teams_link, tenant_id)
        VALUES ('Accounting', 'matric_amended', '10:00', 'https://teams.microsoft.com/accounting', current_tenant)
        RETURNING id INTO accounting_subject_id;
        RAISE NOTICE 'Created new Accounting subject with ID: %', accounting_subject_id;
    ELSE
        RAISE NOTICE 'Found existing Accounting subject with ID: %', accounting_subject_id;
    END IF;
    
    -- Enroll ALL teachers in the Accounting subject
    INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
    SELECT ur.user_id, accounting_subject_id, current_tenant
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE ur.role IN ('teacher', 'tutor')
    AND p.tenant_id = current_tenant
    ON CONFLICT (user_id, subject_id) DO NOTHING;
    
    -- Enroll ALL students in the Accounting subject
    INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
    SELECT ur.user_id, accounting_subject_id, current_tenant
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE ur.role = 'student'
    AND p.tenant_id = current_tenant
    ON CONFLICT (user_id, subject_id) DO NOTHING;
    
    -- Count the relationships created
    SELECT COUNT(*) INTO relationship_count
    FROM public.user_subjects teacher_us
    JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
    JOIN public.user_roles teacher_ur ON teacher_us.user_id = teacher_ur.user_id
    JOIN public.user_roles student_ur ON student_us.user_id = student_ur.user_id
    WHERE teacher_ur.role IN ('teacher', 'tutor')
    AND student_ur.role = 'student'
    AND teacher_us.subject_id = accounting_subject_id;
    
    RAISE NOTICE 'Created % teacher-student relationships through Accounting subject', relationship_count;
    
    -- Show specific enrollments for debugging
    FOR teacher_user_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role IN ('teacher', 'tutor') 
        LIMIT 3
    LOOP
        RAISE NOTICE 'Teacher % enrolled in subjects: %', 
            teacher_user_id,
            (SELECT array_agg(s.name) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = teacher_user_id);
    END LOOP;
    
    FOR student_user_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'student' 
        LIMIT 3
    LOOP
        RAISE NOTICE 'Student % enrolled in subjects: %', 
            student_user_id,
            (SELECT array_agg(s.name) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = student_user_id);
    END LOOP;
    
END $$;

-- Test the get_teacher_students function by creating a debug version
CREATE OR REPLACE FUNCTION public.test_get_teacher_students()
RETURNS TABLE (
    debug_info text,
    student_count integer,
    teacher_subjects text[],
    student_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_role public.app_role;
    current_tenant_id UUID;
    teacher_subject_list text[];
    student_count_result integer;
    all_students jsonb;
BEGIN
    -- Get current user's role and tenant
    SELECT ur.role INTO current_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();

    SELECT public.get_current_tenant_id() INTO current_tenant_id;
    
    -- Get teacher's subjects
    SELECT array_agg(s.name) INTO teacher_subject_list
    FROM public.user_subjects us
    JOIN public.subjects s ON us.subject_id = s.id
    WHERE us.user_id = auth.uid();
    
    -- Count students with shared subjects
    SELECT COUNT(DISTINCT u.id) INTO student_count_result
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    JOIN public.user_roles ur ON u.id = ur.user_id
    JOIN public.user_subjects student_subjects ON student_subjects.user_id = u.id
    JOIN public.user_subjects teacher_subjects ON teacher_subjects.subject_id = student_subjects.subject_id
    WHERE ur.role = 'student'
    AND teacher_subjects.user_id = auth.uid()
    AND p.tenant_id = current_tenant_id;
    
    -- Get detailed student info
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', u.id,
            'name', p.full_name,
            'email', u.email,
            'subjects', (
                SELECT array_agg(s.name)
                FROM public.user_subjects us2
                JOIN public.subjects s ON us2.subject_id = s.id
                WHERE us2.user_id = u.id
            )
        )
    ) INTO all_students
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE ur.role = 'student'
    AND p.tenant_id = current_tenant_id;
    
    RETURN QUERY
    SELECT
        format('Current user: %s, Role: %s, Tenant: %s', auth.uid()::text, current_user_role::text, current_tenant_id::text),
        student_count_result,
        teacher_subject_list,
        all_students;
END;
$$;
