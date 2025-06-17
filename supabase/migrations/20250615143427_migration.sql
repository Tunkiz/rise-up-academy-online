
-- Allow user_id to be NULL for global announcements
ALTER TABLE public.recent_activity ALTER COLUMN user_id DROP NOT NULL;

-- This function will be triggered when a new lesson is added.
-- It creates a global activity record for the new lesson.
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
        INSERT INTO public.recent_activity (user_id, course, activity)
        VALUES (NULL, v_subject_name, 'New lesson: ' || NEW.title);
    END IF;

    RETURN NEW;
END;
$$;

-- This trigger will execute the log_new_lesson_activity function
-- every time a new record is added to lessons.
CREATE TRIGGER on_new_lesson_log_activity
AFTER INSERT ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.log_new_lesson_activity();

-- This function will be triggered when a new resource is added.
-- It creates a global activity record for the new resource.
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
    INSERT INTO public.recent_activity (user_id, course, activity)
    VALUES (NULL, v_subject_name, 'New resource: ' || NEW.title);

    RETURN NEW;
END;
$$;

-- This trigger will execute the log_new_resource_activity function
-- every time a new record is added to resources.
CREATE TRIGGER on_new_resource_log_activity
AFTER INSERT ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.log_new_resource_activity();
