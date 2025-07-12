-- Script to manually add public policies
-- Run this in your Supabase dashboard SQL editor

-- Check if policies exist and create them if not
DO $$ 
BEGIN
    -- Check if the policy exists for subjects
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subjects' 
        AND schemaname = 'public' 
        AND policyname = 'Public can view subjects for registration'
    ) THEN
        CREATE POLICY "Public can view subjects for registration"
        ON public.subjects
        FOR SELECT
        USING (true);
    END IF;
    
    -- Check if the policy exists for subject_categories
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subject_categories' 
        AND schemaname = 'public' 
        AND policyname = 'Public can view subject categories for registration'
    ) THEN
        CREATE POLICY "Public can view subject categories for registration"
        ON public.subject_categories
        FOR SELECT
        USING (true);
    END IF;
END $$;
