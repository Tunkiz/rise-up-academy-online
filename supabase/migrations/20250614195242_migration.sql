
-- Create lessons table
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    lesson_type TEXT NOT NULL, -- e.g., 'video', 'notes', 'quiz'
    content TEXT, -- could be a URL or markdown content
    "order" INT NOT NULL DEFAULT 0,
    UNIQUE(topic_id, title)
);

-- Enable RLS for lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view lessons
CREATE POLICY "Authenticated users can view lessons"
ON public.lessons
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Admins can manage lessons
CREATE POLICY "Admins can manage lessons"
ON public.lessons
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- Create lesson_completions table to track user progress
CREATE TABLE public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- Enable RLS for lesson_completions
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own completions
CREATE POLICY "Users can view their own lesson completions"
ON public.lesson_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own completions
CREATE POLICY "Users can insert their own lesson completions"
ON public.lesson_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own completions
CREATE POLICY "Users can delete their own lesson completions"
ON public.lesson_completions
FOR DELETE
USING (auth.uid() = user_id);

-- Insert sample lessons for Algebra topic
INSERT INTO public.lessons (topic_id, title, lesson_type, "order")
SELECT t.id, 'Introduction to Variables', 'video', 1 
FROM public.topics t JOIN public.subjects s ON t.subject_id = s.id 
WHERE t.name = 'Algebra' AND s.name = 'Mathematics'
ON CONFLICT (topic_id, title) DO NOTHING;

INSERT INTO public.lessons (topic_id, title, lesson_type, "order")
SELECT t.id, 'Solving Linear Equations', 'video', 2 
FROM public.topics t JOIN public.subjects s ON t.subject_id = s.id 
WHERE t.name = 'Algebra' AND s.name = 'Mathematics'
ON CONFLICT (topic_id, title) DO NOTHING;

INSERT INTO public.lessons (topic_id, title, lesson_type, "order")
SELECT t.id, 'Algebra Practice Quiz', 'quiz', 3 
FROM public.topics t JOIN public.subjects s ON t.subject_id = s.id 
WHERE t.name = 'Algebra' AND s.name = 'Mathematics'
ON CONFLICT (topic_id, title) DO NOTHING;

-- Insert sample lessons for Geometry topic
INSERT INTO public.lessons (topic_id, title, lesson_type, "order")
SELECT t.id, 'Points, Lines, and Planes', 'video', 1 
FROM public.topics t JOIN public.subjects s ON t.subject_id = s.id 
WHERE t.name = 'Geometry' AND s.name = 'Mathematics'
ON CONFLICT (topic_id, title) DO NOTHING;

INSERT INTO public.lessons (topic_id, title, lesson_type, "order")
SELECT t.id, 'Angles and Their Measures', 'video', 2 
FROM public.topics t JOIN public.subjects s ON t.subject_id = s.id 
WHERE t.name = 'Geometry' AND s.name = 'Mathematics'
ON CONFLICT (topic_id, title) DO NOTHING;
