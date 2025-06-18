
-- Ensure the default tenant exists
INSERT INTO public.tenants (id, name, domain, is_active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default.edu', true)
ON CONFLICT (id) DO NOTHING;

-- Verify and fix the user_roles table structure to include tenant_id if missing
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    default_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
    user_grade integer;
BEGIN
    -- Handle grade conversion
    IF new.raw_user_meta_data->>'grade' = 'not_applicable' OR new.raw_user_meta_data->>'grade' IS NULL THEN
        user_grade := NULL;
    ELSE
        user_grade := (new.raw_user_meta_data->>'grade')::integer;
    END IF;

    -- Insert profile
    INSERT INTO public.profiles (
        id, 
        full_name, 
        grade, 
        tenant_id
    )
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        user_grade,
        default_tenant_id
    );
    
    -- Assign default student role
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (new.id, 'student', default_tenant_id);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
