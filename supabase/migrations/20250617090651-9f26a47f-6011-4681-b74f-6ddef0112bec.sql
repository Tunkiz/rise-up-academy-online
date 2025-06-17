
-- Fix the registration system and add super admin functionality

-- First, ensure we have the correct tenant structure
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update the default tenant
UPDATE public.tenants 
SET domain = 'default.edu', is_active = true 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add missing role types
DO $$ 
BEGIN
    -- Add student role (used in registration)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE public.app_role ADD VALUE 'student';
    END IF;
    
    -- Add learner role (if not exists)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'learner' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE public.app_role ADD VALUE 'learner';
    END IF;
    
    -- Add parent role (if not exists) 
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'parent' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE public.app_role ADD VALUE 'parent';
    END IF;
    
    -- Add tutor role (if not exists)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'tutor' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
        ALTER TYPE public.app_role ADD VALUE 'tutor';
    END IF;
END $$;

-- Create super admin management functions
CREATE OR REPLACE FUNCTION public.create_tenant(
    tenant_name TEXT,
    tenant_domain TEXT,
    admin_email TEXT,
    admin_password TEXT,
    admin_full_name TEXT
)
RETURNS TABLE(tenant_id UUID, admin_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_tenant_id UUID;
    new_admin_id UUID;
BEGIN
    -- Only super admins can create tenants
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can create tenants.';
    END IF;

    -- Create the tenant
    INSERT INTO public.tenants (name, domain, is_active)
    VALUES (tenant_name, tenant_domain, true)
    RETURNING id INTO new_tenant_id;

    -- Note: In a real implementation, you'd need to handle user creation differently
    -- For now, we'll just return the tenant info and handle admin creation in the frontend
    
    RETURN QUERY SELECT new_tenant_id, NULL::UUID;
END;
$$;

-- Function to assign super admin role (can only be done by existing super admin or during initial setup)
CREATE OR REPLACE FUNCTION public.assign_super_admin_role(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if there are any super admins in the system
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
        -- No super admins exist, allow this assignment (initial setup)
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (target_user_id, 'super_admin', '00000000-0000-0000-0000-000000000001')
        ON CONFLICT (tenant_id, user_id, role) DO NOTHING;
    ELSE
        -- Super admins exist, check if current user is super admin
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Only super admins can assign super admin roles.';
        END IF;
        
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (target_user_id, 'super_admin', '00000000-0000-0000-0000-000000000001')
        ON CONFLICT (tenant_id, user_id, role) DO NOTHING;
    END IF;
END;
$$;

-- Update the handle_new_user function to work properly
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

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
