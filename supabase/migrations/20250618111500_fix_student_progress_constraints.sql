-- This migration ensures proper constraints for student_progress table
-- and fixes the update_student_subject_progress function to use them correctly

-- First, ensure we have the proper unique constraint on student_progress
DO $$ 
BEGIN
    -- Drop old unique constraint if it exists
    BEGIN
        ALTER TABLE public.student_progress 
        DROP CONSTRAINT IF EXISTS student_progress_user_id_subject_id_key;
    EXCEPTION WHEN undefined_object THEN
        -- Constraint doesn't exist, ignore
    END;

    -- Drop the new constraint if it exists (to recreate it)
    BEGIN
        ALTER TABLE public.student_progress 
        DROP CONSTRAINT IF EXISTS student_progress_tenant_id_user_id_subject_id_key;
    EXCEPTION WHEN undefined_object THEN
        -- Constraint doesn't exist, ignore
    END;

    -- Recreate the proper unique constraint that includes tenant_id
    ALTER TABLE public.student_progress 
    ADD CONSTRAINT student_progress_tenant_id_user_id_subject_id_key 
    UNIQUE (tenant_id, user_id, subject_id);
END $$;

-- Now update the function to properly handle tenant_id and use the correct constraint
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
    -- Determine user_id and lesson_id from the trigger event
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        v_user_id := NEW.user_id;
        v_lesson_id := NEW.lesson_id;
        -- Try to get tenant_id from the lesson_completions record first
        v_tenant_id := NEW.tenant_id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
        v_lesson_id := OLD.lesson_id;
        -- Try to get tenant_id from the lesson_completions record first
        v_tenant_id := OLD.tenant_id;
    END IF;

    -- If tenant_id is null, get it from the user's profile
    IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id
        FROM profiles
        WHERE id = v_user_id;

        IF v_tenant_id IS NULL THEN
            -- If still null, get it from the lesson's topic
            SELECT t.tenant_id INTO v_tenant_id
            FROM lessons l
            JOIN topics t ON l.topic_id = t.id
            WHERE l.id = v_lesson_id;

            IF v_tenant_id IS NULL THEN
                RAISE EXCEPTION 'Could not determine tenant_id for user % and lesson %', v_user_id, v_lesson_id;
            END IF;
        END IF;

        -- Update the lesson_completion record with the found tenant_id
        IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
            UPDATE lesson_completions
            SET tenant_id = v_tenant_id
            WHERE id = NEW.id;
        END IF;
    END IF;

    -- Get the subject_id for the lesson (ensuring tenant_id match)
    SELECT t.subject_id INTO v_subject_id
    FROM lessons l
    JOIN topics t ON l.topic_id = t.id
    WHERE l.id = v_lesson_id
    AND t.tenant_id = v_tenant_id;

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
        AND (lc.tenant_id = v_tenant_id OR lc.tenant_id IS NULL);

        -- Calculate progress percentage
        v_progress := (v_completed_lessons::decimal / v_total_lessons::decimal * 100)::int;
    END IF;

    -- First try to update existing record
    UPDATE student_progress
    SET progress = v_progress
    WHERE user_id = v_user_id
    AND subject_id = v_subject_id
    AND tenant_id = v_tenant_id;
    
    -- If no record was updated, insert a new one
    IF NOT FOUND THEN
        INSERT INTO student_progress (user_id, subject_id, progress, tenant_id)
        VALUES (v_user_id, v_subject_id, v_progress, v_tenant_id);
    END IF;

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
IS 'Triggered after lesson completion changes to update the student''s progress percentage for the subject, handling tenant_id properly.';

-- Backfill missing tenant_ids
DO $$ 
BEGIN
    -- First update lesson_completions from topics
    WITH tenant_info AS (
        SELECT DISTINCT l.id as lesson_id, t.tenant_id
        FROM lessons l
        JOIN topics t ON l.topic_id = t.id
        WHERE t.tenant_id IS NOT NULL
    )
    UPDATE lesson_completions lc
    SET tenant_id = ti.tenant_id
    FROM tenant_info ti
    WHERE lc.lesson_id = ti.lesson_id
    AND lc.tenant_id IS NULL;

    -- Then update student_progress from profiles
    UPDATE student_progress sp
    SET tenant_id = p.tenant_id
    FROM profiles p
    WHERE sp.user_id = p.id
    AND sp.tenant_id IS NULL
    AND p.tenant_id IS NOT NULL;

    -- Finally update any remaining student_progress records from topics
    UPDATE student_progress sp
    SET tenant_id = t.tenant_id
    FROM topics t
    JOIN lessons l ON l.topic_id = t.id
    JOIN lesson_completions lc ON lc.lesson_id = l.id
    WHERE sp.user_id = lc.user_id
    AND t.subject_id = sp.subject_id
    AND sp.tenant_id IS NULL
    AND t.tenant_id IS NOT NULL;
END $$;
