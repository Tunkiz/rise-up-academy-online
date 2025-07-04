-- Migration: Change subject name uniqueness constraint to be per-category instead of per-tenant
-- This allows the same subject name to exist in different categories within the same tenant

-- Step 1: Drop the existing global unique constraint per tenant
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_tenant_id_name_key;

-- Step 2: Create a function to validate unique subject names per category
CREATE OR REPLACE FUNCTION public.validate_subject_name_per_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    conflicting_subject_id UUID;
    subject_categories public.subject_category[];
BEGIN
    -- Get the categories for this subject
    IF TG_OP = 'INSERT' THEN
        -- For new subjects, we need to wait for categories to be assigned
        -- The validation will happen in the set_subject_categories function
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- For updates, check if name changed
        IF OLD.name = NEW.name THEN
            RETURN NEW; -- Name didn't change, no validation needed
        END IF;
        
        -- Get current categories for this subject
        SELECT array_agg(category) INTO subject_categories
        FROM public.subject_categories 
        WHERE subject_id = NEW.id;
        
        -- Check for conflicts with the new name in the same categories
        FOR i IN 1..coalesce(array_length(subject_categories, 1), 0) LOOP
            SELECT s.id INTO conflicting_subject_id
            FROM public.subjects s
            JOIN public.subject_categories sc ON s.id = sc.subject_id
            WHERE s.tenant_id = NEW.tenant_id
            AND s.name = NEW.name
            AND s.id != NEW.id
            AND sc.category = subject_categories[i];
            
            IF conflicting_subject_id IS NOT NULL THEN
                RAISE EXCEPTION 'A subject with the name "%" already exists in category "%"', 
                    NEW.name, subject_categories[i];
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Step 3: Create trigger for subject name validation
DROP TRIGGER IF EXISTS validate_subject_name_per_category_trigger ON public.subjects;
CREATE TRIGGER validate_subject_name_per_category_trigger
    BEFORE INSERT OR UPDATE ON public.subjects
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_subject_name_per_category();

-- Step 4: Update the set_subject_categories function to validate uniqueness
CREATE OR REPLACE FUNCTION public.set_subject_categories(
    p_subject_id UUID,
    p_categories public.subject_category[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    subject_tenant_id UUID;
    subject_name TEXT;
    category_item public.subject_category;
    conflicting_subject_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can manage subject categories.';
    END IF;

    -- Get subject's tenant_id and name
    SELECT tenant_id, name INTO subject_tenant_id, subject_name
    FROM public.subjects
    WHERE id = p_subject_id;

    IF subject_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Subject not found.';
    END IF;

    -- Validate that this subject name is unique within each category
    IF p_categories IS NOT NULL AND array_length(p_categories, 1) > 0 THEN
        FOREACH category_item IN ARRAY p_categories
        LOOP
            SELECT s.id INTO conflicting_subject_id
            FROM public.subjects s
            JOIN public.subject_categories sc ON s.id = sc.subject_id
            WHERE s.tenant_id = subject_tenant_id
            AND s.name = subject_name
            AND s.id != p_subject_id
            AND sc.category = category_item;
            
            IF conflicting_subject_id IS NOT NULL THEN
                RAISE EXCEPTION 'A subject with the name "%" already exists in category "%"', 
                    subject_name, category_item;
            END IF;
        END LOOP;
    END IF;

    -- Remove existing categories for this subject
    DELETE FROM public.subject_categories
    WHERE subject_id = p_subject_id;

    -- Add new categories
    IF p_categories IS NOT NULL AND array_length(p_categories, 1) > 0 THEN
        FOREACH category_item IN ARRAY p_categories
        LOOP
            INSERT INTO public.subject_categories (subject_id, category, tenant_id)
            VALUES (p_subject_id, category_item, subject_tenant_id);
        END LOOP;
    END IF;
END;
$$;

-- Step 5: Update the add_subject_category function to validate uniqueness
CREATE OR REPLACE FUNCTION public.add_subject_category(
    p_subject_id UUID,
    p_category public.subject_category
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    subject_tenant_id UUID;
    subject_name TEXT;
    conflicting_subject_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can manage subject categories.';
    END IF;

    -- Get subject's tenant_id and name
    SELECT tenant_id, name INTO subject_tenant_id, subject_name
    FROM public.subjects
    WHERE id = p_subject_id;

    IF subject_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Subject not found.';
    END IF;

    -- Check for conflicting subject name in the same category
    SELECT s.id INTO conflicting_subject_id
    FROM public.subjects s
    JOIN public.subject_categories sc ON s.id = sc.subject_id
    WHERE s.tenant_id = subject_tenant_id
    AND s.name = subject_name
    AND s.id != p_subject_id
    AND sc.category = p_category;
    
    IF conflicting_subject_id IS NOT NULL THEN
        RAISE EXCEPTION 'A subject with the name "%" already exists in category "%"', 
            subject_name, p_category;
    END IF;

    -- Insert the category assignment
    INSERT INTO public.subject_categories (subject_id, category, tenant_id)
    VALUES (p_subject_id, p_category, subject_tenant_id)
    ON CONFLICT (subject_id, category, tenant_id) DO NOTHING;
END;
$$;

-- Add comment explaining the new constraint behavior
COMMENT ON FUNCTION public.validate_subject_name_per_category() IS 'Validates that subject names are unique within each category, but allows the same name across different categories';
COMMENT ON FUNCTION public.set_subject_categories(UUID, public.subject_category[]) IS 'Sets all categories for a subject, replacing existing ones, with validation for unique names per category';
COMMENT ON FUNCTION public.add_subject_category(UUID, public.subject_category) IS 'Adds a category to a subject with validation for unique names per category';
