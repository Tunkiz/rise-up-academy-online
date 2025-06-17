
-- Add a pass_mark column to the lessons table for quizzes.
ALTER TABLE public.lessons
ADD COLUMN pass_mark INTEGER CHECK (pass_mark IS NULL OR (pass_mark >= 0 AND pass_mark <= 100));

-- Set a default pass mark of 70% for all existing quiz-type lessons.
UPDATE public.lessons SET pass_mark = 70 WHERE lesson_type = 'quiz' AND pass_mark IS NULL;

-- Create a new table to store the results of each quiz attempt.
CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    passed BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security on the new table.
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Add policies to control access to quiz attempts.
-- Users can see their own attempts.
CREATE POLICY "Users can view their own quiz attempts"
ON public.quiz_attempts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save their own new attempts.
CREATE POLICY "Users can insert their own quiz attempts"
ON public.quiz_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can see all attempts for reporting.
CREATE POLICY "Admins can view all quiz attempts"
ON public.quiz_attempts
FOR SELECT
USING (public.is_admin());
