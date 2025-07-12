-- Create missing functions required by other migrations

-- Create is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, return false as we'll implement proper admin checks later
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Create get_current_tenant_id() function
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- For now, return the first tenant ID as default
    RETURN (SELECT id FROM public.tenants LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- Create subject_category enum
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

-- Update existing subjects to have a default category
UPDATE public.subjects 
SET category = 'national_senior' 
WHERE category IS NULL;

-- Insert some sample subjects with categories for testing
INSERT INTO public.subjects (name, category) VALUES 
    ('Mathematics', 'matric_amended'),
    ('Physical Sciences', 'matric_amended'),
    ('Life Sciences', 'matric_amended'),
    ('English Home Language', 'matric_amended'),
    ('Afrikaans First Additional Language', 'matric_amended'),
    ('History', 'matric_amended'),
    ('Geography', 'matric_amended'),
    ('Business Studies', 'matric_amended'),
    ('Economics', 'matric_amended'),
    ('Accounting', 'matric_amended'),
    ('Tourism', 'matric_amended'),
    ('Information Technology', 'matric_amended'),
    ('Computer Applications Technology', 'matric_amended'),
    ('Engineering Graphics and Design', 'matric_amended'),
    ('Technical Mathematics', 'matric_amended'),
    ('Technical Sciences', 'matric_amended'),
    ('Consumer Studies', 'matric_amended'),
    ('Hospitality Studies', 'matric_amended'),
    ('Agricultural Sciences', 'matric_amended'),
    ('Agricultural Technology', 'matric_amended'),
    ('Drama', 'matric_amended'),
    ('Music', 'matric_amended'),
    ('Visual Arts', 'matric_amended'),
    ('Dance Studies', 'matric_amended')
ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category;

-- Create subject_categories table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.subject_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    category public.subject_category NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subject_categories_unique_subject_category_tenant UNIQUE (subject_id, category, tenant_id)
);

-- Enable RLS on the new table
ALTER TABLE public.subject_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subject_categories
CREATE POLICY "Public can view subject categories"
ON public.subject_categories
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can view subject categories"
ON public.subject_categories
FOR SELECT
TO authenticated
USING (true);

-- Populate subject_categories table with existing data
INSERT INTO public.subject_categories (subject_id, category, tenant_id)
SELECT s.id, s.category, t.id
FROM public.subjects s, public.tenants t
WHERE s.category IS NOT NULL
ON CONFLICT (subject_id, category, tenant_id) DO NOTHING;
