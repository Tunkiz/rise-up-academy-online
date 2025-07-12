-- Migration to add public read policies safely
-- This will add policies to allow unauthenticated users to read subjects during registration

-- First, add policy for subjects if it doesn't exist
DO $$ 
BEGIN
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
        
        RAISE NOTICE 'Created policy: Public can view subjects for registration';
    ELSE
        RAISE NOTICE 'Policy already exists: Public can view subjects for registration';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating subjects policy: %', SQLERRM;
END $$;

-- Then, add policy for subject_categories if it doesn't exist
DO $$ 
BEGIN
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
        
        RAISE NOTICE 'Created policy: Public can view subject categories for registration';
    ELSE
        RAISE NOTICE 'Policy already exists: Public can view subject categories for registration';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating subject_categories policy: %', SQLERRM;
END $$;
