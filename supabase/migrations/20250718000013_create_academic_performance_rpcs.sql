-- Create RPC functions for academic performance data access
-- These functions will work similar to get_user_stats but for detailed academic data

-- Function to get quiz attempts with lesson and subject details
CREATE OR REPLACE FUNCTION public.get_student_quiz_attempts(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    score integer,
    passed boolean,
    created_at timestamptz,
    lesson_title text,
    subject_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Allow admins, teachers, and tutors to access quiz attempts
    -- Teachers/tutors can only access data for students in their subjects
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'teacher', 'tutor')
    ) THEN
        RAISE EXCEPTION 'Only admins, teachers, and tutors can access student quiz attempts.';
    END IF;

    -- For non-admin users, check if they share subjects with the student
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        -- Check if teacher/tutor shares subjects with the student
        IF NOT EXISTS (
            SELECT 1
            FROM public.user_subjects teacher_us
            JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
            WHERE teacher_us.user_id = auth.uid()
            AND student_us.user_id = p_user_id
        ) THEN
            RAISE EXCEPTION 'You can only access quiz attempts for students in your subjects.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        qa.id,
        qa.score,
        qa.passed,
        qa.created_at,
        COALESCE(l.title, 'Unknown Lesson') AS lesson_title,
        COALESCE(s.name, 'Unknown Subject') AS subject_name
    FROM public.quiz_attempts qa
    LEFT JOIN public.lessons l ON qa.lesson_id = l.id
    LEFT JOIN public.topics t ON l.topic_id = t.id
    LEFT JOIN public.subjects s ON t.subject_id = s.id
    WHERE qa.user_id = p_user_id
    ORDER BY qa.created_at DESC;
END;
$$;

-- Function to get lesson completions with lesson and subject details
CREATE OR REPLACE FUNCTION public.get_student_lesson_completions(p_user_id uuid)
RETURNS TABLE(
    id uuid,
    completed_at timestamptz,
    lesson_title text,
    subject_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Allow admins, teachers, and tutors to access lesson completions
    -- Teachers/tutors can only access data for students in their subjects
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'teacher', 'tutor')
    ) THEN
        RAISE EXCEPTION 'Only admins, teachers, and tutors can access student lesson completions.';
    END IF;

    -- For non-admin users, check if they share subjects with the student
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        -- Check if teacher/tutor shares subjects with the student
        IF NOT EXISTS (
            SELECT 1
            FROM public.user_subjects teacher_us
            JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
            WHERE teacher_us.user_id = auth.uid()
            AND student_us.user_id = p_user_id
        ) THEN
            RAISE EXCEPTION 'You can only access lesson completions for students in your subjects.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        lc.id,
        lc.completed_at,
        COALESCE(l.title, 'Unknown Lesson') AS lesson_title,
        COALESCE(s.name, 'Unknown Subject') AS subject_name
    FROM public.lesson_completions lc
    LEFT JOIN public.lessons l ON lc.lesson_id = l.id
    LEFT JOIN public.topics t ON l.topic_id = t.id
    LEFT JOIN public.subjects s ON t.subject_id = s.id
    WHERE lc.user_id = p_user_id
    ORDER BY lc.completed_at DESC;
END;
$$;
