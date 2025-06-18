
-- Update the get_user_learning_stats function to include active_subjects and fix tenant scoping
DROP FUNCTION IF EXISTS get_user_learning_stats(UUID);

CREATE FUNCTION get_user_learning_stats(p_user_id UUID)
RETURNS TABLE (
    lessons_completed INTEGER,
    total_study_hours INTEGER,
    active_subjects INTEGER
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
    ),
    active_subjects_count AS (
        SELECT COUNT(DISTINCT us.subject_id) as active_count
        FROM user_subjects us
        WHERE us.user_id = p_user_id
    )
    SELECT 
        completed_lessons::INTEGER as lessons_completed,
        (total_minutes / 60)::INTEGER as total_study_hours,
        active_count::INTEGER as active_subjects
    FROM lesson_completions, active_subjects_count;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_learning_stats(UUID) TO authenticated;

-- Add duration_minutes column to lessons table if it doesn't exist
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;

-- Update existing lessons to have a default duration
UPDATE public.lessons SET duration_minutes = 30 WHERE duration_minutes IS NULL;

-- Fix RLS policies for lesson_completions to allow users to manage their own completions
DROP POLICY IF EXISTS "Users can view their own lesson completions" ON public.lesson_completions;
DROP POLICY IF EXISTS "Users can insert their own lesson completions" ON public.lesson_completions;
DROP POLICY IF EXISTS "Users can delete their own lesson completions" ON public.lesson_completions;

CREATE POLICY "Users can view their own lesson completions"
ON public.lesson_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson completions"
ON public.lesson_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson completions"
ON public.lesson_completions
FOR DELETE
USING (auth.uid() = user_id);

-- Fix RLS policies for quiz_attempts
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Users can view their own quiz attempts"
ON public.quiz_attempts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts"
ON public.quiz_attempts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for student_progress
DROP POLICY IF EXISTS "Enable read access for own progress" ON public.student_progress;
CREATE POLICY "Users can view their own progress"
ON public.student_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.student_progress
FOR ALL
USING (auth.uid() = user_id);

-- Add RLS policies for recent_activity
DROP POLICY IF EXISTS "Enable read access for own recent activity" ON public.recent_activity;
CREATE POLICY "Users can view their own recent activity"
ON public.recent_activity
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);
