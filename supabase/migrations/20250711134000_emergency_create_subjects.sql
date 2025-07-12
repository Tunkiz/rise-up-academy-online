-- Emergency migration to create subjects table
-- This will ensure the subjects table exists

-- Create the subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    class_time TEXT,
    teams_link TEXT,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    category public.subject_category,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects(name);
CREATE INDEX IF NOT EXISTS idx_subjects_tenant_id ON public.subjects(tenant_id);

-- Add some sample data for testing
INSERT INTO public.subjects (name, class_time, category) VALUES
('Mathematics', '10:00 AM', 'matric_amended'),
('English', '11:00 AM', 'matric_amended'),
('Physics', '2:00 PM', 'national_senior'),
('Chemistry', '3:00 PM', 'national_senior'),
('Biology', '9:00 AM', 'senior_phase')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Add public read policy for unauthenticated users (for registration)
CREATE POLICY "Public can view subjects for registration"
ON public.subjects
FOR SELECT
USING (true);

-- Add authenticated user policy
CREATE POLICY "Authenticated users can view subjects"
ON public.subjects
FOR SELECT
USING (auth.role() = 'authenticated');

-- Add admin policy
CREATE POLICY "Admins can manage subjects"
ON public.subjects
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);
