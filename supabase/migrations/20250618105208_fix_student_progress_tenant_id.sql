-- This migration fixes the update_student_subject_progress() function to properly handle tenant_id
-- The tenant_id needs to be propagated from the lesson_completions through to student_progress

-- Function to update student progress for a specific subject, now including tenant_id
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
    v_tenant_id UUID;
BEGIN
    -- Determine user_id, lesson_id, and tenant_id from the trigger event
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        v_user_id := NEW.user_id;
        v_lesson_id := NEW.lesson_id;
        v_tenant_id := NEW.tenant_id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
        v_lesson_id := OLD.lesson_id;
        v_tenant_id := OLD.tenant_id;
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

    -- Count total lessons in the subject (within the same tenant)
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons l
    JOIN topics t ON l.topic_id = t.id
    WHERE t.subject_id = v_subject_id
    AND t.tenant_id = v_tenant_id;

    -- If there are no lessons, progress is 0
    IF v_total_lessons = 0 THEN
        v_progress := 0;
    ELSE
        -- Count completed lessons for the user in the subject (within the same tenant)
        SELECT COUNT(*) INTO v_completed_lessons
        FROM lesson_completions lc
        JOIN lessons l ON lc.lesson_id = l.id
        JOIN topics t ON l.topic_id = t.id
        WHERE lc.user_id = v_user_id 
        AND t.subject_id = v_subject_id
        AND lc.tenant_id = v_tenant_id;

        -- Calculate progress percentage
        v_progress := (v_completed_lessons::decimal / v_total_lessons::decimal * 100)::int;
    END IF;

    -- Upsert the progress into student_progress table, including tenant_id
    -- Using ON CONFLICT on the unique constraint which includes tenant_id
    INSERT INTO student_progress (user_id, subject_id, progress, tenant_id)
    VALUES (v_user_id, v_subject_id, v_progress, v_tenant_id)
    ON CONFLICT (tenant_id, user_id, subject_id)
    DO UPDATE SET progress = EXCLUDED.progress;

    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_lesson_completion_change ON public.lesson_completions;
CREATE TRIGGER on_lesson_completion_change
AFTER INSERT OR UPDATE OR DELETE ON public.lesson_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_student_subject_progress();

-- Add comment
COMMENT ON FUNCTION public.update_student_subject_progress()
IS 'Triggered after lesson completion changes to update the student''s progress percentage for the subject, ensuring tenant_id is propagated.';

-- Check and update unique constraint on student_progress if needed
DO $$ 
BEGIN
    -- Drop old unique constraint if it exists
    ALTER TABLE public.student_progress 
    DROP CONSTRAINT IF EXISTS student_progress_user_id_subject_id_key;

    -- Add new unique constraint that includes tenant_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'student_progress_tenant_id_user_id_subject_id_key'
    ) THEN
        ALTER TABLE public.student_progress 
        ADD CONSTRAINT student_progress_tenant_id_user_id_subject_id_key 
        UNIQUE (tenant_id, user_id, subject_id);
    END IF;
END $$;

-- Backfill missing tenant_ids in student_progress if any exist
UPDATE public.student_progress sp
SET tenant_id = lc.tenant_id
FROM public.lesson_completions lc
JOIN public.lessons l ON lc.lesson_id = l.id
JOIN public.topics t ON l.topic_id = t.id
WHERE sp.user_id = lc.user_id
AND sp.subject_id = t.subject_id
AND sp.tenant_id IS NULL
AND EXISTS (
    SELECT 1
    FROM public.lesson_completions lc2
    WHERE lc2.user_id = sp.user_id
    AND lc2.tenant_id IS NOT NULL
    LIMIT 1
);
