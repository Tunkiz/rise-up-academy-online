-- Simple migration to add public read access to subjects
-- Check if policy exists first

DO $$ 
BEGIN
    -- Try to create the policy, ignore if it already exists
    BEGIN
        CREATE POLICY "Public can view subjects for registration"
        ON public.subjects
        FOR SELECT
        USING (true);
    EXCEPTION WHEN duplicate_object THEN
        -- Policy already exists, do nothing
        NULL;
    END;
    
    -- Try to create the policy for subject_categories
    BEGIN
        CREATE POLICY "Public can view subject categories for registration"
        ON public.subject_categories
        FOR SELECT
        USING (true);
    EXCEPTION WHEN duplicate_object THEN
        -- Policy already exists, do nothing
        NULL;
    END;
END $$;
