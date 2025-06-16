
-- Update the update_user_role function to handle tenant_id properly
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_tenant_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    -- Get the target user's tenant_id
    SELECT p.tenant_id INTO target_tenant_id
    FROM public.profiles p
    WHERE p.id = target_user_id;

    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Target user tenant not found.';
    END IF;

    -- Super admins can update any user's role
    -- Tenant admins can only update users within their own tenant
    IF NOT public.is_super_admin() THEN
        IF target_tenant_id != public.get_current_tenant_id() THEN
            RAISE EXCEPTION 'You can only update roles for users in your organization.';
        END IF;
    END IF;

    -- Remove existing role assignments for the user
    DELETE FROM public.user_roles WHERE user_id = target_user_id;

    -- Insert the new role for the user with proper tenant_id
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (target_user_id, new_role, target_tenant_id);
END;
$$;
