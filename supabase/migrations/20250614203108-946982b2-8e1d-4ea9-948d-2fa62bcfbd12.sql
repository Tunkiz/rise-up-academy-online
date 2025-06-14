
-- Create a table for quiz questions
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0
);

-- Create a table for quiz options
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS for questions table
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Enable RLS for options table
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all users to read quiz questions and options
CREATE POLICY "Allow read access to quiz questions and options"
ON public.quiz_questions FOR SELECT
USING (true);

CREATE POLICY "Allow read access to quiz options"
ON public.quiz_options FOR SELECT
USING (true);

-- Indexes for performance
CREATE INDEX ON public.quiz_questions (lesson_id);
CREATE INDEX ON public.quiz_options (question_id);
