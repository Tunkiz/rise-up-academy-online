-- Create a public function to get subjects for registration
CREATE OR REPLACE FUNCTION public.get_public_subjects()
RETURNS TABLE(
    id UUID,
    name TEXT,
    class_time TEXT,
    teams_link TEXT,
    tenant_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.class_time,
        s.teams_link,
        s.tenant_id
    FROM public.subjects s
    ORDER BY s.name;
END;
$$;

-- Grant execution to anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_subjects() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_subjects() TO authenticated;
