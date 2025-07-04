-- Migration: Convert subjects from one-to-one to many-to-many relationship with categories

-- Step 1: Create junction table for subject-category relationships
CREATE TABLE IF NOT EXISTS public.subject_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    category public.subject_category NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subject_categories_unique_subject_category_tenant UNIQUE (subject_id, category, tenant_id)
);

-- Step 2: Enable RLS on the new table
ALTER TABLE public.subject_categories ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for subject_categories
CREATE POLICY "Authenticated users can view subject categories"
ON public.subject_categories
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage subject categories"
ON public.subject_categories
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Step 4: Migrate existing data from subjects.category to subject_categories table
DO $$
DECLARE
    subject_record RECORD;
BEGIN
    -- For each subject that has a category, create a record in subject_categories
    FOR subject_record IN 
        SELECT id, category, tenant_id 
        FROM public.subjects 
        WHERE category IS NOT NULL
    LOOP
        INSERT INTO public.subject_categories (subject_id, category, tenant_id)
        VALUES (subject_record.id, subject_record.category, subject_record.tenant_id)
        ON CONFLICT (subject_id, category, tenant_id) DO NOTHING;
    END LOOP;
END $$;

-- Step 5: Remove the category column from subjects table
-- (We'll keep it for now and make it nullable for backward compatibility)
ALTER TABLE public.subjects ALTER COLUMN category DROP NOT NULL;

-- Step 6: Create helper functions for working with subject categories

-- Function to get categories for a subject
CREATE OR REPLACE FUNCTION public.get_subject_categories(p_subject_id UUID)
RETURNS TABLE(category public.subject_category)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT sc.category
    FROM public.subject_categories sc
    WHERE sc.subject_id = p_subject_id
    ORDER BY sc.category;
END;
$$;

-- Function to add category to subject
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
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can manage subject categories.';
    END IF;

    -- Get subject's tenant_id
    SELECT tenant_id INTO subject_tenant_id
    FROM public.subjects
    WHERE id = p_subject_id;

    IF subject_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Subject not found.';
    END IF;

    -- Insert the category assignment
    INSERT INTO public.subject_categories (subject_id, category, tenant_id)
    VALUES (p_subject_id, p_category, subject_tenant_id)
    ON CONFLICT (subject_id, category, tenant_id) DO NOTHING;
END;
$$;

-- Function to remove category from subject
CREATE OR REPLACE FUNCTION public.remove_subject_category(
    p_subject_id UUID,
    p_category public.subject_category
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can manage subject categories.';
    END IF;

    DELETE FROM public.subject_categories
    WHERE subject_id = p_subject_id AND category = p_category;
END;
$$;

-- Function to set all categories for a subject (replaces existing ones)
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
    category_item public.subject_category;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can manage subject categories.';
    END IF;

    -- Get subject's tenant_id
    SELECT tenant_id INTO subject_tenant_id
    FROM public.subjects
    WHERE id = p_subject_id;

    IF subject_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Subject not found.';
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_subject_categories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_subject_category(UUID, public.subject_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_subject_category(UUID, public.subject_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_subject_categories(UUID, public.subject_category[]) TO authenticated;

-- Comment the table and functions
COMMENT ON TABLE public.subject_categories IS 'Junction table for many-to-many relationship between subjects and categories';
COMMENT ON FUNCTION public.get_subject_categories(UUID) IS 'Returns all categories for a given subject';
COMMENT ON FUNCTION public.add_subject_category(UUID, public.subject_category) IS 'Adds a category to a subject';
COMMENT ON FUNCTION public.remove_subject_category(UUID, public.subject_category) IS 'Removes a category from a subject';
COMMENT ON FUNCTION public.set_subject_categories(UUID, public.subject_category[]) IS 'Sets all categories for a subject, replacing existing ones';
