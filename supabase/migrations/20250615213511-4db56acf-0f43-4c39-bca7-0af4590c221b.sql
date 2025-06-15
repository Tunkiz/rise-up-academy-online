
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
    total_users_count BIGINT,
    new_users_last_30_days BIGINT,
    total_subjects_count BIGINT,
    total_lessons_count BIGINT,
    total_resources_count BIGINT,
    total_lessons_completed BIGINT,
    total_quizzes_attempted BIGINT,
    most_popular_subjects JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM auth.users) AS total_users_count,
        (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '30 days') AS new_users_last_30_days,
        (SELECT COUNT(*) FROM public.subjects) AS total_subjects_count,
        (SELECT COUNT(*) FROM public.lessons) AS total_lessons_count,
        (SELECT COUNT(*) FROM public.resources) AS total_resources_count,
        (SELECT COUNT(*) FROM public.lesson_completions) AS total_lessons_completed,
        (SELECT COUNT(*) FROM public.quiz_attempts) AS total_quizzes_attempted,
        (
            SELECT jsonb_agg(pop_subjects)
            FROM (
                SELECT
                    s.name,
                    s.id,
                    COUNT(us.user_id) as student_count
                FROM public.subjects s
                LEFT JOIN public.user_subjects us ON s.id = us.subject_id
                GROUP BY s.id, s.name
                ORDER BY student_count DESC
                LIMIT 5
            ) pop_subjects
        ) AS most_popular_subjects;
END;
$$;
