-- Clean up duplicate subjects and ensure proper teacher-student relationships
DO $$
DECLARE
    current_tenant UUID;
    accounting_subject_clean UUID;
    accounting_subject_with_space UUID;
    english_subject UUID;
BEGIN
    -- Get the current tenant
    SELECT id INTO current_tenant FROM public.tenants LIMIT 1;
    
    RAISE NOTICE 'Cleaning up duplicate subjects...';
    
    -- Find the clean "Accounting" subject
    SELECT id INTO accounting_subject_clean
    FROM public.subjects
    WHERE name = 'Accounting' AND tenant_id = current_tenant
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Find the "Accounting " subject (with trailing space)
    SELECT id INTO accounting_subject_with_space
    FROM public.subjects
    WHERE name = 'Accounting ' AND tenant_id = current_tenant
    LIMIT 1;
    
    -- Find or create English subject
    SELECT id INTO english_subject
    FROM public.subjects
    WHERE name = 'English' AND tenant_id = current_tenant
    LIMIT 1;
    
    IF english_subject IS NULL THEN
        INSERT INTO public.subjects (name, category, class_time, teams_link, tenant_id)
        VALUES ('English', 'matric_amended', '11:00', 'https://teams.microsoft.com/english', current_tenant)
        RETURNING id INTO english_subject;
        RAISE NOTICE 'Created English subject: %', english_subject;
    END IF;
    
    RAISE NOTICE 'Clean Accounting: %, Spaced Accounting: %, English: %', 
                 accounting_subject_clean, accounting_subject_with_space, english_subject;
    
    -- If there's a duplicate subject with space, migrate enrollments to the clean one
    IF accounting_subject_with_space IS NOT NULL AND accounting_subject_clean IS NOT NULL THEN
        -- Update user_subjects to use the clean accounting subject
        UPDATE public.user_subjects 
        SET subject_id = accounting_subject_clean
        WHERE subject_id = accounting_subject_with_space;
        
        -- Delete the duplicate subject
        DELETE FROM public.subjects WHERE id = accounting_subject_with_space;
        
        RAISE NOTICE 'Merged duplicate Accounting subjects';
    END IF;
    
    -- Ensure ALL teachers are enrolled in both Accounting and English
    INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
    SELECT DISTINCT ur.user_id, accounting_subject_clean, current_tenant
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE ur.role IN ('teacher', 'tutor')
    AND p.tenant_id = current_tenant
    ON CONFLICT (user_id, subject_id) DO NOTHING;
    
    INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
    SELECT DISTINCT ur.user_id, english_subject, current_tenant
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE ur.role IN ('teacher', 'tutor')
    AND p.tenant_id = current_tenant
    ON CONFLICT (user_id, subject_id) DO NOTHING;
    
    -- Ensure the student is enrolled in both subjects
    INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
    SELECT DISTINCT ur.user_id, accounting_subject_clean, current_tenant
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE ur.role = 'student'
    AND p.tenant_id = current_tenant
    ON CONFLICT (user_id, subject_id) DO NOTHING;
    
    INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
    SELECT DISTINCT ur.user_id, english_subject, current_tenant
    FROM public.user_roles ur
    JOIN public.profiles p ON ur.user_id = p.id
    WHERE ur.role = 'student'
    AND p.tenant_id = current_tenant
    ON CONFLICT (user_id, subject_id) DO NOTHING;
    
    RAISE NOTICE 'Enrolled all teachers and students in both Accounting and English subjects';
    
    -- Verify the relationships
    RAISE NOTICE 'Final verification:';
    
    -- Show teacher enrollments
    FOR accounting_subject_clean IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role IN ('teacher', 'tutor')
    LOOP
        RAISE NOTICE 'Teacher % subjects: %', 
            accounting_subject_clean,
            (SELECT array_agg(s.name ORDER BY s.name) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = accounting_subject_clean);
    END LOOP;
    
    -- Show student enrollments
    FOR accounting_subject_clean IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'student'
    LOOP
        RAISE NOTICE 'Student % subjects: %', 
            accounting_subject_clean,
            (SELECT array_agg(s.name ORDER BY s.name) 
             FROM public.user_subjects us 
             JOIN public.subjects s ON us.subject_id = s.id 
             WHERE us.user_id = accounting_subject_clean);
    END LOOP;
    
END $$;
