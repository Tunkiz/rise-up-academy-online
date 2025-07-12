
-- Phase 1: Multi-tenancy Foundation

-- Step 1: Create the tenants table to represent each organization
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.tenants IS 'Represents an organization or tenant in the SaaS platform.';

-- Trigger to automatically update `updated_at` on tenants table
DROP TRIGGER IF EXISTS handle_tenants_updated_at ON public.tenants;
CREATE TRIGGER handle_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 2: Add tenant_id to all relevant tables to scope data.
-- We make it nullable for now to handle existing data. We will migrate data later.
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.topics ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.lessons ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.resources ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.student_progress ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.deadlines ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.recent_activity ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_completions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.quiz_attempts ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.study_plans ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tutor_notes ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.class_schedules ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.user_subjects ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Step 3: Update unique constraints to be tenant-aware

-- Subjects: A subject name should be unique within a tenant, not globally.
ALTER TABLE public.subjects DROP CONSTRAINT subjects_name_key;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_tenant_id_name_key UNIQUE (tenant_id, name);

-- User Roles: A user can have one role per tenant.
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_tenant_id_user_id_role_key UNIQUE (tenant_id, user_id, role);

-- User Subjects: Prevent a user from being enrolled in the same subject multiple times within a tenant.
ALTER TABLE public.user_subjects ADD CONSTRAINT user_subjects_tenant_id_user_id_subject_id_key UNIQUE (tenant_id, user_id, subject_id);


-- Step 4: Create a helper function to get the current user's tenant_id
-- This will be crucial for writing simple and performant RLS policies in the next step.
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT p.tenant_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
        LIMIT 1
    );
END;
$$;
COMMENT ON FUNCTION public.get_current_tenant_id() IS 'Fetches the tenant_id for the currently authenticated user from their profile.';
