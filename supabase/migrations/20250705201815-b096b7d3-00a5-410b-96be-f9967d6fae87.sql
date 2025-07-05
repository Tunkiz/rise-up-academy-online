-- Fix the handle_new_user function to properly handle learner_category from registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
    user_grade integer;
    user_learner_category public.subject_category;
BEGIN
    -- Handle grade conversion
    IF new.raw_user_meta_data->>'grade' = 'not_applicable' OR new.raw_user_meta_data->>'grade' IS NULL OR new.raw_user_meta_data->>'grade' = '' THEN
        user_grade := NULL;
    ELSE
        user_grade := (new.raw_user_meta_data->>'grade')::integer;
    END IF;

    -- Handle learner_category conversion with fallback to default
    IF new.raw_user_meta_data->>'learner_category' IS NOT NULL AND new.raw_user_meta_data->>'learner_category' != '' THEN
        user_learner_category := (new.raw_user_meta_data->>'learner_category')::public.subject_category;
    ELSE
        user_learner_category := 'national_senior'::public.subject_category; -- Default fallback
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (
        id, 
        full_name, 
        grade, 
        learner_category,
        tenant_id
    )
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        user_grade,
        user_learner_category,
        default_tenant_id
    );
    
    -- Assign default student role
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (new.id, 'student', default_tenant_id);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;