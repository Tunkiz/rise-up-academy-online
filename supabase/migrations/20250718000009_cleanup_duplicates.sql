-- Clean up duplicate enrollments and orphaned subjects
DO $$
DECLARE
    current_tenant UUID;
    spaced_accounting_id UUID;
BEGIN
    -- Get current tenant
    SELECT id INTO current_tenant FROM public.tenants LIMIT 1;
    
    RAISE NOTICE 'Cleaning up duplicate enrollments...';
    
    -- Find the mysterious "Accounting " subject with space
    SELECT id INTO spaced_accounting_id 
    FROM public.subjects 
    WHERE name LIKE 'Accounting %' AND tenant_id = current_tenant;
    
    IF spaced_accounting_id IS NOT NULL THEN
        RAISE NOTICE 'Found spaced Accounting subject: %', spaced_accounting_id;
        -- Delete enrollments in the spaced subject
        DELETE FROM public.user_subjects WHERE subject_id = spaced_accounting_id;
        -- Delete the spaced subject itself
        DELETE FROM public.subjects WHERE id = spaced_accounting_id;
        RAISE NOTICE 'Deleted spaced Accounting subject';
    END IF;
    
    -- Remove duplicate enrollments by creating a temp table with distinct values
    CREATE TEMP TABLE temp_clean_enrollments AS
    SELECT DISTINCT user_id, subject_id, tenant_id
    FROM public.user_subjects
    WHERE tenant_id = current_tenant;
    
    -- Delete all enrollments for this tenant
    DELETE FROM public.user_subjects WHERE tenant_id = current_tenant;
    
    -- Insert back the clean enrollments
    INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
    SELECT user_id, subject_id, tenant_id FROM temp_clean_enrollments;
    
    DROP TABLE temp_clean_enrollments;
    
    RAISE NOTICE 'Cleaned up duplicate enrollments';
    
    -- Final verification
    RAISE NOTICE '=== CLEAN VERIFICATION ===';
    
    -- Show all subjects
    FOR spaced_accounting_id IN SELECT id FROM public.subjects WHERE tenant_id = current_tenant LOOP
        RAISE NOTICE 'Subject: % = %', 
            spaced_accounting_id,
            (SELECT name FROM public.subjects WHERE id = spaced_accounting_id);
    END LOOP;
    
    -- Show teacher enrollments
    FOR spaced_accounting_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('teacher', 'tutor') LOOP
        RAISE NOTICE 'Teacher %: subjects = %', 
            spaced_accounting_id,
            (SELECT COALESCE(array_agg(s.name ORDER BY s.name), ARRAY['NONE']) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = spaced_accounting_id);
    END LOOP;
    
    -- Show student enrollments
    FOR spaced_accounting_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'student' LOOP
        RAISE NOTICE 'Student %: subjects = %', 
            spaced_accounting_id,
            (SELECT COALESCE(array_agg(s.name ORDER BY s.name), ARRAY['NONE']) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = spaced_accounting_id);
    END LOOP;
    
    -- Final count
    DECLARE
        final_shared_count INTEGER;
    BEGIN
        SELECT COUNT(DISTINCT student_subjects.user_id) INTO final_shared_count
        FROM public.user_subjects teacher_subjects
        JOIN public.user_subjects student_subjects ON teacher_subjects.subject_id = student_subjects.subject_id
        JOIN public.user_roles teacher_roles ON teacher_subjects.user_id = teacher_roles.user_id
        JOIN public.user_roles student_roles ON student_subjects.user_id = student_roles.user_id
        WHERE teacher_roles.role IN ('teacher', 'tutor')
        AND student_roles.role = 'student';
        
        RAISE NOTICE 'Final students with shared subjects: %', final_shared_count;
    END;
    
END $$;
