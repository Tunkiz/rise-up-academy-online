-- Fix the update_user_subjects_by_admin function to include tenant_id when inserting records

CREATE OR REPLACE FUNCTION public.update_user_subjects_by_admin(
    target_user_id UUID,
    new_subject_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    -- Get the user's tenant_id from their profile
    SELECT tenant_id INTO user_tenant_id FROM public.profiles WHERE id = target_user_id;
    
    IF user_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User does not have an associated tenant';
    END IF;

    -- First, remove all existing subject associations for the user.
    DELETE FROM public.user_subjects WHERE user_id = target_user_id;

    -- Then, insert the new subject associations if any are provided.
    IF array_length(new_subject_ids, 1) > 0 THEN
        INSERT INTO public.user_subjects (user_id, subject_id, tenant_id)
        SELECT target_user_id, s_id, user_tenant_id FROM unnest(new_subject_ids) AS s(s_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;