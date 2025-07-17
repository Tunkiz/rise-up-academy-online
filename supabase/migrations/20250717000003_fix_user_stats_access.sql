-- Fix get_user_stats function to allow teachers and tutors access to user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE(
    lessons_completed_count bigint,
    quizzes_attempted_count bigint,
    average_quiz_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Allow admins, teachers, and tutors to access user stats
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'teacher', 'tutor')
    ) THEN
        RAISE EXCEPTION 'Only admins, teachers, and tutors can access user statistics.';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.lesson_completions WHERE user_id = p_user_id) AS lessons_completed_count,
        (SELECT COUNT(*) FROM public.quiz_attempts WHERE user_id = p_user_id) AS quizzes_attempted_count,
        (SELECT AVG(score) FROM public.quiz_attempts WHERE user_id = p_user_id) AS average_quiz_score;
END;
$$;
