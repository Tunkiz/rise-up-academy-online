
-- Drop dependent functions and triggers to avoid errors during re-creation.
DROP FUNCTION IF EXISTS public.get_all_users();
DROP FUNCTION IF EXISTS public.get_user_details(uuid);
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add 'grade' column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS grade INTEGER;

-- Create a table to link users to subjects they are registered for.
CREATE TABLE IF NOT EXISTS public.user_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  UNIQUE(user_id, subject_id)
);

-- Enable Row Level Security for the new table
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subjects
-- Users can view their own subjects
CREATE POLICY "Users can view their own subject registrations" ON public.user_subjects
FOR SELECT USING (auth.uid() = user_id);

-- Users can create/delete their own subjects
CREATE POLICY "Users can manage their own subject registrations" ON public.user_subjects
FOR ALL USING (auth.uid() = user_id);

-- Admins can do anything
CREATE POLICY "Admins can manage all subject registrations" ON public.user_subjects
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Re-create the function that handles new user creation to include grade.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, grade)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    (NULLIF(new.raw_user_meta_data->>'grade', ''))::integer
  );
  RETURN new;
END;
$$;

-- Re-create the trigger for the function above.
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- Re-create the function to retrieve all users with new details.
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    role public.app_role,
    created_at timestamptz,
    banned_until timestamptz,
    avatar_url text,
    grade integer,
    subjects jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email::text,
        ur.role,
        u.created_at,
        u.banned_until,
        p.avatar_url,
        p.grade,
        (
            SELECT jsonb_agg(s.*)
            FROM public.user_subjects us
            JOIN public.subjects s ON us.subject_id = s.id
            WHERE us.user_id = u.id
        ) AS subjects
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    ORDER BY u.created_at DESC;
END;
$$;


-- Re-create the function to retrieve a single user's details with new info.
CREATE OR REPLACE FUNCTION public.get_user_details(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    role public.app_role,
    created_at timestamptz,
    banned_until timestamptz,
    avatar_url text,
    grade integer,
    subjects jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        p.full_name,
        u.email::text,
        ur.role,
        u.created_at,
        u.banned_until,
        p.avatar_url,
        p.grade,
        (
            SELECT jsonb_agg(s.*)
            FROM public.user_subjects us
            JOIN public.subjects s ON us.subject_id = s.id
            WHERE us.user_id = u.id
        ) AS subjects
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.id = p_user_id;
END;
$$;

