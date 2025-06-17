
-- Create a table to store class schedules
CREATE TABLE public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    meeting_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security for the new table
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to view class schedules
CREATE POLICY "Allow authenticated users to view class schedules"
ON public.class_schedules
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Allow admins to create, update, and delete class schedules
CREATE POLICY "Allow admins to manage class schedules"
ON public.class_schedules
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Insert some sample data for demonstration purposes
INSERT INTO public.class_schedules (subject_id, title, start_time, end_time, meeting_link)
SELECT
    s.id,
    'Algebra Basics',
    now() + interval '2 hours',
    now() + interval '3 hours',
    'https://meet.example.com/algebra-basics'
FROM public.subjects s WHERE s.name = 'Mathematics'
ON CONFLICT DO NOTHING;

INSERT INTO public.class_schedules (subject_id, title, start_time, end_time, meeting_link)
SELECT
    s.id,
    'Shakespearean Sonnets',
    now() + interval '1 day',
    now() + interval '1 day 1 hour',
    'https://meet.example.com/shakespeare'
FROM public.subjects s WHERE s.name = 'English'
ON CONFLICT DO NOTHING;

INSERT INTO public.class_schedules (subject_id, title, start_time, end_time, meeting_link)
SELECT
    s.id,
    'Intro to Physics',
    now() + interval '2 days',
    now() + interval '2 days 2 hours',
    'https://meet.example.com/intro-physics'
FROM public.subjects s WHERE s.name = 'Physical Sciences'
ON CONFLICT DO NOTHING;

