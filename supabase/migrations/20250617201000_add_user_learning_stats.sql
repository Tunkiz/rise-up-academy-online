-- Drop the function if it exists (idempotency)
DROP FUNCTION IF EXISTS get_user_learning_stats(UUID);

-- Create the function
CREATE FUNCTION get_user_learning_stats(p_user_id UUID)
RETURNS TABLE (
    lessons_completed INTEGER,
    total_study_hours INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the user is trying to access their own stats
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot access stats for other users';
    END IF;

    RETURN QUERY
    WITH lesson_completions AS (
        SELECT 
            COUNT(*) as completed_lessons,
            COALESCE(SUM(l.duration_minutes), 0) as total_minutes
        FROM lesson_completions lc
        JOIN lessons l ON l.id = lc.lesson_id
        WHERE lc.user_id = p_user_id
    )
    SELECT 
        completed_lessons::INTEGER as lessons_completed,
        (total_minutes / 60)::INTEGER as total_study_hours
    FROM lesson_completions;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_learning_stats(UUID) TO authenticated;
