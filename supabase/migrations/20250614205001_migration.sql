
CREATE OR REPLACE FUNCTION public.get_quiz_lessons_by_subject(p_subject_id UUID)
RETURNS TABLE(id UUID, title TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT l.id, l.title
  FROM public.lessons l
  JOIN public.topics t ON l.topic_id = t.id
  WHERE t.subject_id = p_subject_id AND l.lesson_type = 'quiz'
$$;
