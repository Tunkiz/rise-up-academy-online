
-- Function to update student progress for a specific subject
CREATE OR REPLACE FUNCTION public.update_student_subject_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subject_id UUID;
    v_total_lessons INT;
    v_completed_lessons INT;
    v_progress INT;
    v_user_id UUID;
    v_lesson_id UUID;
BEGIN
    -- Determine user_id and lesson_id from the trigger event
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        v_user_id := NEW.user_id;
        v_lesson_id := NEW.lesson_id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
        v_lesson_id := OLD.lesson_id;
    END IF;

    -- Get the subject_id for the lesson
    SELECT t.subject_id INTO v_subject_id
    FROM lessons l
    JOIN topics t ON l.topic_id = t.id
    WHERE l.id = v_lesson_id;

    -- If no subject is found, exit
    IF v_subject_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Count total lessons in the subject
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons l
    JOIN topics t ON l.topic_id = t.id
    WHERE t.subject_id = v_subject_id;

    -- If there are no lessons, progress is 0
    IF v_total_lessons = 0 THEN
        v_progress := 0;
    ELSE
        -- Count completed lessons for the user in the subject
        SELECT COUNT(*) INTO v_completed_lessons
        FROM lesson_completions lc
        JOIN lessons l ON lc.lesson_id = l.id
        JOIN topics t ON l.topic_id = t.id
        WHERE lc.user_id = v_user_id AND t.subject_id = v_subject_id;

        -- Calculate progress percentage
        v_progress := (v_completed_lessons::decimal / v_total_lessons::decimal * 100)::int;
    END IF;

    -- Upsert the progress into student_progress table
    INSERT INTO student_progress (user_id, subject_id, progress)
    VALUES (v_user_id, v_subject_id, v_progress)
    ON CONFLICT (user_id, subject_id)
    DO UPDATE SET progress = EXCLUDED.progress;

    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$;

-- Trigger to call the function on insert, update, or delete in lesson_completions
CREATE TRIGGER on_lesson_completion_change
AFTER INSERT OR UPDATE OR DELETE ON public.lesson_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_student_subject_progress();
