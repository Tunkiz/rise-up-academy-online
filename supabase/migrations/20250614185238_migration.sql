
-- Create tables
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    progress INT NOT NULL CHECK (progress >= 0 AND progress <= 100),
    UNIQUE(user_id, subject_id)
);

CREATE TABLE public.deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date DATE NOT NULL
);

CREATE TABLE public.recent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course TEXT NOT NULL,
    activity TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_activity ENABLE ROW LEVEL SECURITY;

-- Policies for subjects
CREATE POLICY "Allow authenticated read access to subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (true);

-- Policies for student_progress
CREATE POLICY "Enable read access for own progress"
ON public.student_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policies for deadlines
CREATE POLICY "Enable read access for own deadlines"
ON public.deadlines
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policies for recent_activity
CREATE POLICY "Enable read access for own recent activity"
ON public.recent_activity
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Insert sample data
INSERT INTO public.subjects (name) VALUES ('Mathematics'), ('Physical Sciences'), ('English');

