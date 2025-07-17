-- Create missing database functions for subject categories and user stats

-- Function to get subject categories
CREATE OR REPLACE FUNCTION public.get_subject_categories(p_subject_id uuid)
RETURNS TABLE(category subject_category)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT sc.category
    FROM public.subject_categories sc
    WHERE sc.subject_id = p_subject_id;
END;
$$;

-- Function to set subject categories (replaces all existing categories)
CREATE OR REPLACE FUNCTION public.set_subject_categories(p_subject_id uuid, p_categories subject_category[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_tenant_id UUID;
    cat subject_category;
BEGIN
    -- Only admins can set subject categories
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can set subject categories.';
    END IF;

    -- Get current tenant ID
    current_tenant_id := public.get_current_tenant_id();

    -- First, remove all existing categories for this subject
    DELETE FROM public.subject_categories 
    WHERE subject_id = p_subject_id;

    -- Then, insert the new categories
    IF p_categories IS NOT NULL AND array_length(p_categories, 1) > 0 THEN
        FOREACH cat IN ARRAY p_categories
        LOOP
            INSERT INTO public.subject_categories (subject_id, category, tenant_id)
            VALUES (p_subject_id, cat, current_tenant_id);
        END LOOP;
    END IF;
END;
$$;

-- Function to add a single category to a subject
CREATE OR REPLACE FUNCTION public.add_subject_category(p_subject_id uuid, p_category subject_category)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_tenant_id UUID;
BEGIN
    -- Only admins can add subject categories
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can add subject categories.';
    END IF;

    -- Get current tenant ID
    current_tenant_id := public.get_current_tenant_id();

    -- Insert the new category if it doesn't already exist
    INSERT INTO public.subject_categories (subject_id, category, tenant_id)
    VALUES (p_subject_id, p_category, current_tenant_id)
    ON CONFLICT (subject_id, category) DO NOTHING;
END;
$$;

-- Function to remove a category from a subject
CREATE OR REPLACE FUNCTION public.remove_subject_category(p_subject_id uuid, p_category subject_category)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only admins can remove subject categories
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can remove subject categories.';
    END IF;

    -- Remove the category
    DELETE FROM public.subject_categories
    WHERE subject_id = p_subject_id AND category = p_category;
END;
$$;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE(
    lessons_completed_count bigint,
    quizzes_attempted_count bigint,
    average_quiz_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only admins can access user stats
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can access user statistics.';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.lesson_completions WHERE user_id = p_user_id) AS lessons_completed_count,
        (SELECT COUNT(*) FROM public.quiz_attempts WHERE user_id = p_user_id) AS quizzes_attempted_count,
        (SELECT AVG(score) FROM public.quiz_attempts WHERE user_id = p_user_id) AS average_quiz_score;
END;
$$;