
-- Add description to lessons table
ALTER TABLE public.lessons ADD COLUMN description TEXT;

-- Add attachment_url for video lesson notes to lessons table
ALTER TABLE public.lessons ADD COLUMN attachment_url TEXT;

-- Add time_limit for quizzes to lessons table (in minutes)
ALTER TABLE public.lessons ADD COLUMN time_limit INTEGER;

-- Add explanation to quiz_questions table
ALTER TABLE public.quiz_questions ADD COLUMN explanation TEXT;
