
-- Create a table for topics within a subject
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    UNIQUE(name, subject_id)
);

-- Enable RLS for topics
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view topics
CREATE POLICY "Authenticated users can view topics"
ON public.topics
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Admins can manage topics
CREATE POLICY "Admins can manage topics"
ON public.topics
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Insert sample topics for Mathematics
INSERT INTO public.topics (name, subject_id)
SELECT 'Algebra', id FROM public.subjects WHERE name = 'Mathematics'
ON CONFLICT DO NOTHING;

INSERT INTO public.topics (name, subject_id)
SELECT 'Geometry', id FROM public.subjects WHERE name = 'Mathematics'
ON CONFLICT DO NOTHING;

INSERT INTO public.topics (name, subject_id)
SELECT 'Calculus', id FROM public.subjects WHERE name = 'Mathematics'
ON CONFLICT DO NOTHING;

-- Insert sample topics for Physical Sciences
INSERT INTO public.topics (name, subject_id)
SELECT 'Physics', id FROM public.subjects WHERE name = 'Physical Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.topics (name, subject_id)
SELECT 'Chemistry', id FROM public.subjects WHERE name = 'Physical Sciences'
ON CONFLICT DO NOTHING;

-- Insert sample topics for English
INSERT INTO public.topics (name, subject_id)
SELECT 'Grammar', id FROM public.subjects WHERE name = 'English'
ON CONFLICT DO NOTHING;

INSERT INTO public.topics (name, subject_id)
SELECT 'Literature', id FROM public.subjects WHERE name = 'English'
ON CONFLICT DO NOTHING;

