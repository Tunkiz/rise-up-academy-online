-- Final fix for teacher-student relationships
-- Force enrollment and clean up properly

DO $$
DECLARE
    current_tenant UUID;
    accounting_subject UUID;
    english_subject UUID;
    teacher_id UUID;
    student_id UUID;
    spaced_accounting_subject UUID;
BEGIN
    -- Get the current tenant
    SELECT id INTO current_tenant FROM public.tenants LIMIT 1;
    
    -- Get the clean subjects
    SELECT id INTO accounting_subject FROM public.subjects WHERE name = 'Accounting' AND tenant_id = current_tenant;
    SELECT id INTO english_subject FROM public.subjects WHERE name = 'English' AND tenant_id = current_tenant;
    
    -- Find and remove the spaced accounting subject
    SELECT id INTO spaced_accounting_subject FROM public.subjects WHERE name = 'Accounting ' AND tenant_id = current_tenant;
    
    IF spaced_accounting_subject IS NOT NULL THEN
        -- Move all enrollments from spaced to clean accounting
        UPDATE public.user_subjects 
        SET subject_id = accounting_subject 
        WHERE subject_id = spaced_accounting_subject;
        
        -- Delete the spaced subject
        DELETE FROM public.subjects WHERE id = spaced_accounting_subject;
        RAISE NOTICE 'Removed duplicate spaced Accounting subject';
    END IF;
    
    RAISE NOTICE 'Working with Accounting: %, English: %', accounting_subject, english_subject;
    
    -- Force enroll ALL teachers in BOTH subjects
    FOR teacher_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('teacher', 'tutor') LOOP
        -- Accounting enrollment
        INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
        VALUES (teacher_id, accounting_subject, current_tenant)
        ON CONFLICT (user_id, subject_id) DO NOTHING;
        
        -- English enrollment  
        INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
        VALUES (teacher_id, english_subject, current_tenant)
        ON CONFLICT (user_id, subject_id) DO NOTHING;
        
        RAISE NOTICE 'Enrolled teacher % in both subjects', teacher_id;
    END LOOP;
    
    -- Force enroll ALL students in BOTH subjects
    FOR student_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'student' LOOP
        -- Accounting enrollment
        INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
        VALUES (student_id, accounting_subject, current_tenant)
        ON CONFLICT (user_id, subject_id) DO NOTHING;
        
        -- English enrollment
        INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
        VALUES (student_id, english_subject, current_tenant)
        ON CONFLICT (user_id, subject_id) DO NOTHING;
        
        RAISE NOTICE 'Enrolled student % in both subjects', student_id;
    END LOOP;
    
    -- Final verification with detailed output
    RAISE NOTICE '=== FINAL VERIFICATION ===';
    
    FOR teacher_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('teacher', 'tutor') LOOP
        RAISE NOTICE 'Teacher %: subjects = %', 
            teacher_id,
            (SELECT COALESCE(array_agg(s.name ORDER BY s.name), ARRAY['NONE']) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = teacher_id);
    END LOOP;
    
    FOR student_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'student' LOOP
        RAISE NOTICE 'Student %: subjects = %', 
            student_id,
            (SELECT COALESCE(array_agg(s.name ORDER BY s.name), ARRAY['NONE']) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = student_id);
    END LOOP;
    
    -- Count shared subjects between teachers and students
    DECLARE
        shared_count INTEGER;
    BEGIN
        SELECT COUNT(DISTINCT student_subjects.user_id) INTO shared_count
        FROM public.user_subjects teacher_subjects
        JOIN public.user_subjects student_subjects ON teacher_subjects.subject_id = student_subjects.subject_id
        JOIN public.user_roles teacher_roles ON teacher_subjects.user_id = teacher_roles.user_id
        JOIN public.user_roles student_roles ON student_subjects.user_id = student_roles.user_id
        WHERE teacher_roles.role IN ('teacher', 'tutor')
        AND student_roles.role = 'student';
        
        RAISE NOTICE 'Students with shared subjects with teachers: %', shared_count;
    END;
    
END $$;
