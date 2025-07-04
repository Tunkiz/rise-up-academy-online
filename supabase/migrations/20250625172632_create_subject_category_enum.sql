
-- Create enum type for subject categories
CREATE TYPE public.subject_category AS ENUM (
    'matric_amended',
    'national_senior', 
    'senior_phase'
);

-- Add category column to subjects table
ALTER TABLE public.subjects 
ADD COLUMN category public.subject_category;

-- Update existing subjects to have a default category (can be changed later)
UPDATE public.subjects 
SET category = 'national_senior' 
WHERE category IS NULL;

-- Make category required for new subjects
ALTER TABLE public.subjects 
ALTER COLUMN category SET NOT NULL;
