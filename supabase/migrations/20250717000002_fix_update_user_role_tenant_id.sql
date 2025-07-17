-- Fix update_user_role function to include tenant_id when updating user roles
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id uuid,
    new_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_tenant_id uuid;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    -- Get the tenant_id for the target user
    SELECT tenant_id INTO target_tenant_id 
    FROM public.profiles 
    WHERE id = target_user_id;

    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User profile not found or tenant_id is null';
    END IF;

    -- This function enforces a single role per user, which aligns with the current UI.
    -- It first removes any existing roles for the user, then inserts the new role.
    -- This handles both cases: assigning a role for the first time, and changing an existing role.

    -- First, remove all existing role assignments for the user to ensure a clean slate.
    DELETE FROM public.user_roles WHERE user_id = target_user_id;

    -- Then, insert the new role for the user with the correct tenant_id.
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (target_user_id, new_role, target_tenant_id);
END;
$$;
