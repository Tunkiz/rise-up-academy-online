
-- Add due_date to lessons table
ALTER TABLE public.lessons
ADD COLUMN due_date TIMESTAMPTZ;

-- Function to get upcoming lesson deadlines for a user based on their enrolled subjects
CREATE OR REPLACE FUNCTION public.get_user_lesson_deadlines(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    due_date timestamptz,
    lesson_type text,
    subject_name text,
    topic_id uuid,
    subject_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.title,
        l.due_date,
        l.lesson_type,
        s.name as subject_name,
        l.topic_id,
        t.subject_id
    FROM
        public.lessons l
    JOIN
        public.topics t ON l.topic_id = t.id
    JOIN
        public.subjects s ON t.subject_id = s.id
    JOIN
        public.user_subjects us ON s.id = us.subject_id
    WHERE
        us.user_id = p_user_id
        AND l.due_date IS NOT NULL
        AND l.due_date >= now()
    ORDER BY
        l.due_date ASC;
END;
$$;
