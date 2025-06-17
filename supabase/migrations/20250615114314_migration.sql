
-- Add a 'grade' column to the 'resources' table to allow for grade-specific resources.
-- This can be left NULL for resources applicable to all grades.
ALTER TABLE public.resources ADD COLUMN grade INTEGER;

-- Add a 'grade' column to the 'lessons' table to allow for grade-specific lessons.
-- This can be left NULL for lessons applicable to all grades.
ALTER TABLE public.lessons ADD COLUMN grade INTEGER;

-- Create a function for administrators to update a user's full name and grade.
-- This ensures that only admins can modify this sensitive information.
CREATE OR REPLACE FUNCTION public.update_user_details_by_admin(
    target_user_id UUID,
    new_full_name TEXT,
    new_grade INT
)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    UPDATE public.profiles
    SET
        full_name = new_full_name,
        grade = new_grade
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function for administrators to manage a user's subject enrollments.
-- This will replace the user's current subjects with the new set provided.
CREATE OR REPLACE FUNCTION public.update_user_subjects_by_admin(
    target_user_id UUID,
    new_subject_ids UUID[]
)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    -- First, remove all existing subject associations for the user.
    DELETE FROM public.user_subjects WHERE user_id = target_user_id;

    -- Then, insert the new subject associations if any are provided.
    IF array_length(new_subject_ids, 1) > 0 THEN
        INSERT INTO public.user_subjects (user_id, subject_id)
        SELECT target_user_id, s_id FROM unnest(new_subject_ids) AS s(s_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
