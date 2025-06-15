
CREATE OR REPLACE FUNCTION public.get_user_activity(p_user_id uuid)
RETURNS TABLE(id uuid, activity text, course text, date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    RETURN QUERY
    SELECT
        ra.id,
        ra.activity,
        ra.course,
        ra.date
    FROM public.recent_activity ra
    WHERE ra.user_id = p_user_id
    ORDER BY ra.date DESC
    LIMIT 15;
END;
$function$
