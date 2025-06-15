
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id uuid,
    new_role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can perform this action.';
    END IF;

    -- This function enforces a single role per user, which aligns with the current UI.
    -- It first removes any existing roles for the user, then inserts the new role.
    -- This handles both cases: assigning a role for the first time, and changing an existing role.

    -- First, remove all existing role assignments for the user to ensure a clean slate.
    DELETE FROM public.user_roles WHERE user_id = target_user_id;

    -- Then, insert the new role for the user.
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, new_role);
END;
$$;
