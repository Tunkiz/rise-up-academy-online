
-- Create enum type for subject categories
DO $$ BEGIN
    CREATE TYPE public.subject_category AS ENUM (
        'matric_amended',
        'national_senior', 
        'senior_phase'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add category column to subjects table
DO $$ BEGIN
    ALTER TABLE public.subjects 
    ADD COLUMN category public.subject_category;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update existing subjects to have a default category (can be changed later)
UPDATE public.subjects 
SET category = 'national_senior' 
WHERE category IS NULL;

-- Make category required for new subjects
DO $$ BEGIN
    ALTER TABLE public.subjects 
    ALTER COLUMN category SET NOT NULL;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;
