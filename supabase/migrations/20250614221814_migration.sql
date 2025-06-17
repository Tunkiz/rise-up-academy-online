
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

    -- This assumes a user has only one role entry. If a user can have
    -- multiple roles, this logic might need to be more complex.
    -- Based on the current setup, we'll update the existing role entry.
    UPDATE public.user_roles
    SET role = new_role
    WHERE user_id = target_user_id;

    -- If the user might not have a role entry yet, we might need an UPSERT.
    -- For now, we assume an entry exists for every user.
    -- Example of upsert (if needed later):
    -- INSERT INTO public.user_roles (user_id, role)
    -- VALUES (target_user_id, new_role)
    -- ON CONFLICT (user_id) DO UPDATE
    -- SET role = new_role;
END;
$$;
