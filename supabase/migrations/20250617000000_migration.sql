-- This migration updates all triggers that insert into the recent_activity table
-- to include the tenant_id column, which is now mandatory.

-- Fix the log_new_lesson_activity function
CREATE OR REPLACE FUNCTION public.log_new_lesson_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subject_name TEXT;
BEGIN
    -- Get subject name from the related tables.
    SELECT s.name
    INTO v_subject_name
    FROM public.topics t
    JOIN public.subjects s ON t.subject_id = s.id
    WHERE t.id = NEW.topic_id;

    -- If a subject is found, insert a record into the recent_activity table.
    -- user_id is NULL because this is a global announcement.
    IF FOUND THEN
        INSERT INTO public.recent_activity (user_id, course, activity, tenant_id)
        VALUES (NULL, v_subject_name, 'New lesson: ' || NEW.title, NEW.tenant_id);
    END IF;

    RETURN NEW;
END;
$$;

-- Fix the log_new_resource_activity function
CREATE OR REPLACE FUNCTION public.log_new_resource_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subject_name TEXT;
BEGIN
    -- Get subject name from the related table, if it exists.
    IF NEW.subject_id IS NOT NULL THEN
        SELECT s.name
        INTO v_subject_name
        FROM public.subjects s
        WHERE s.id = NEW.subject_id;
    ELSE
        v_subject_name := 'General';
    END IF;

    -- Insert a record into the recent_activity table.
    -- user_id is NULL because this is a global announcement.
    INSERT INTO public.recent_activity (user_id, course, activity, tenant_id)
    VALUES (NULL, v_subject_name, 'New resource: ' || NEW.title, NEW.tenant_id);

    RETURN NEW;
END;
$$;

-- Fix the log_lesson_completion_activity function
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
    -- Get lesson title and subject from the related tables.
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
        INSERT INTO public.recent_activity (user_id, course, activity, tenant_id)
        VALUES (NEW.user_id, v_subject_name, 'Completed: ' || v_lesson_title, NEW.tenant_id);
    END IF;

    RETURN NEW;
END;
$$;

-- Fix the log_quiz_attempt_activity function
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
    -- Get quiz title and subject from the related tables.
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

        INSERT INTO public.recent_activity (user_id, course, activity, tenant_id)
        VALUES (NEW.user_id, v_subject_name, v_activity_text, NEW.tenant_id);
    END IF;

    RETURN NEW;
END;
$$;
