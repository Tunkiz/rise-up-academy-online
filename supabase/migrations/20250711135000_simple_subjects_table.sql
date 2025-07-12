-- Simple subjects table creation for immediate fix
-- This will create the subjects table without dependencies

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class_time TEXT,
    teams_link TEXT,
    tenant_id UUID,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add some sample data for testing
INSERT INTO public.subjects (name, class_time, category) VALUES
('Mathematics', '10:00 AM', 'matric_amended'),
('English', '11:00 AM', 'matric_amended'),
('Physics', '2:00 PM', 'national_senior'),
('Chemistry', '3:00 PM', 'national_senior'),
('Biology', '9:00 AM', 'senior_phase')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Add public read policy for unauthenticated users (for registration)
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
    END IF;
END $$;
