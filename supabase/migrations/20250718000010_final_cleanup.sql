-- Investigate and fix the duplicate subject issue at the root
DO $$
DECLARE
    current_tenant UUID;
    accounting_subjects UUID[];
    english_subjects UUID[];
    final_accounting UUID;
    final_english UUID;
    temp_subject_id UUID;
BEGIN
    -- Get current tenant
    SELECT id INTO current_tenant FROM public.tenants LIMIT 1;
    
    -- Find ALL accounting subjects (including variations)
    SELECT array_agg(id) INTO accounting_subjects
    FROM public.subjects 
    WHERE (name = 'Accounting' OR name = 'Accounting ' OR name LIKE 'Accounting%')
    AND tenant_id = current_tenant;
    
    -- Find ALL english subjects
    SELECT array_agg(id) INTO english_subjects
    FROM public.subjects 
    WHERE (name = 'English' OR name = 'English ' OR name LIKE 'English%')
    AND tenant_id = current_tenant;
    
    RAISE NOTICE 'Found Accounting subjects: %', accounting_subjects;
    RAISE NOTICE 'Found English subjects: %', english_subjects;
    
    -- Keep the first accounting subject, delete others
    IF array_length(accounting_subjects, 1) > 0 THEN
        final_accounting := accounting_subjects[1];
        
        -- Move all enrollments to the final accounting subject
        FOR i IN 2..array_length(accounting_subjects, 1) LOOP
            temp_subject_id := accounting_subjects[i];
            UPDATE public.user_subjects 
            SET subject_id = final_accounting 
            WHERE subject_id = temp_subject_id;
            DELETE FROM public.subjects WHERE id = temp_subject_id;
            RAISE NOTICE 'Merged accounting subject % into %', temp_subject_id, final_accounting;
        END LOOP;
    END IF;
    
    -- Keep the first english subject, delete others  
    IF array_length(english_subjects, 1) > 0 THEN
        final_english := english_subjects[1];
        
        -- Move all enrollments to the final english subject
        FOR i IN 2..array_length(english_subjects, 1) LOOP
            temp_subject_id := english_subjects[i];
            UPDATE public.user_subjects 
            SET subject_id = final_english 
            WHERE subject_id = temp_subject_id;
            DELETE FROM public.subjects WHERE id = temp_subject_id;
            RAISE NOTICE 'Merged english subject % into %', temp_subject_id, final_english;
        END LOOP;
    END IF;
    
    -- Now clean up any remaining duplicates in user_subjects
    DELETE FROM public.user_subjects 
    WHERE ctid NOT IN (
        SELECT MIN(ctid) 
        FROM public.user_subjects 
        GROUP BY user_id, subject_id
    );
    
    RAISE NOTICE 'Cleaned up duplicate user_subjects entries';
    
    -- Update subject names to be clean
    UPDATE public.subjects SET name = 'Accounting' WHERE id = final_accounting;
    UPDATE public.subjects SET name = 'English' WHERE id = final_english;
    
    -- Final verification
    RAISE NOTICE '=== FINAL CLEAN STATE ===';
    
    -- Show remaining subjects
    FOR temp_subject_id IN SELECT id FROM public.subjects WHERE tenant_id = current_tenant ORDER BY name LOOP
        RAISE NOTICE 'Subject: % (%) with % enrollments', 
            (SELECT name FROM public.subjects WHERE id = temp_subject_id),
            temp_subject_id,
            (SELECT COUNT(*) FROM public.user_subjects WHERE subject_id = temp_subject_id);
    END LOOP;
    
    -- Show clean enrollments
    FOR temp_subject_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('teacher', 'tutor') LOOP
        RAISE NOTICE 'Teacher %: %', 
            temp_subject_id,
            (SELECT array_agg(s.name ORDER BY s.name) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = temp_subject_id);
    END LOOP;
    
    FOR temp_subject_id IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'student' LOOP
        RAISE NOTICE 'Student %: %', 
            temp_subject_id,
            (SELECT array_agg(s.name ORDER BY s.name) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = temp_subject_id);
    END LOOP;
    
END $$;
