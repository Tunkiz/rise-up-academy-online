
-- This function will be triggered when a lesson is completed.
-- It finds the lesson and subject name and creates a new activity record.
CREATE OR REPLACE FUNCTION public.log_lesson_completion_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lesson_title TEXT;
    v_subject_name TEXT;
BEGIN
    -- Get lesson title and subject name from the related tables.
    SELECT
        l.title,
        s.name
    INTO
        v_lesson_title,
        v_subject_name
    FROM
        public.lessons l
    JOIN
        public.topics t ON l.topic_id = t.id
    JOIN
        public.subjects s ON t.subject_id = s.id
    WHERE
        l.id = NEW.lesson_id;

    -- If a lesson is found, insert a record into the recent_activity table.
    IF FOUND THEN
        INSERT INTO public.recent_activity (user_id, course, activity)
        VALUES (NEW.user_id, v_subject_name, 'Completed: ' || v_lesson_title);
    END IF;

    RETURN NEW;
END;
$$;

-- This trigger will execute the log_lesson_completion_activity function
-- every time a new record is added to lesson_completions.
CREATE TRIGGER on_lesson_completion_log_activity
AFTER INSERT ON public.lesson_completions
FOR EACH ROW
EXECUTE FUNCTION public.log_lesson_completion_activity();

-- This function will be triggered when a quiz is attempted.
-- It finds the quiz title and subject, and creates a new activity record
-- indicating whether the quiz was passed or just attempted.
CREATE OR REPLACE FUNCTION public.log_quiz_attempt_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quiz_title TEXT;
    v_subject_name TEXT;
    v_activity_text TEXT;
BEGIN
    -- Get quiz title and subject name.
    SELECT
        l.title,
        s.name
    INTO
        v_quiz_title,
        v_subject_name
    FROM
        public.lessons l
    JOIN
        public.topics t ON l.topic_id = t.id
    JOIN
        public.subjects s ON t.subject_id = s.id
    WHERE
        l.id = NEW.lesson_id AND l.lesson_type = 'quiz';

    -- If a quiz is found, create the activity text and insert the record.
    IF FOUND THEN
        IF NEW.passed THEN
            v_activity_text := 'Passed quiz: ' || v_quiz_title;
        ELSE
            v_activity_text := 'Attempted quiz: ' || v_quiz_title;
        END IF;

        INSERT INTO public.recent_activity (user_id, course, activity)
        VALUES (NEW.user_id, v_subject_name, v_activity_text);
    END IF;

    RETURN NEW;
END;
$$;

-- This trigger will execute the log_quiz_attempt_activity function
-- every time a new record is added to quiz_attempts.
CREATE TRIGGER on_quiz_attempt_log_activity
AFTER INSERT ON public.quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.log_quiz_attempt_activity();
