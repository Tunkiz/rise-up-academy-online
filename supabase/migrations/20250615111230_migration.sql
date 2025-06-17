
-- The previous migration failed. This script corrects the issue by first
-- removing any functions or policies that are about to be changed.

-- Drop existing functions and triggers to avoid "cannot change return type" errors.
DROP FUNCTION IF EXISTS public.get_all_users();
DROP FUNCTION IF EXISTS public.get_user_details(uuid);
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing policies on the avatars bucket if they exist to prevent errors.
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatar" ON storage.objects;

-- Now, we can safely re-run the setup script.

-- 1. Create a publicly accessible storage bucket for avatars.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Add an 'avatar_url' column to the 'profiles' table to store the image link.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Re-create security policies for the new avatars bucket.
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'avatars' );

CREATE POLICY "Allow users to upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );

CREATE POLICY "Allow users to update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );

CREATE POLICY "Allow users to delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );

-- 4. Re-create the function that handles new user creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

-- Re-create the trigger for the function above.
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- 5. Re-create the function for admins to also retrieve the new avatar_url.
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    role public.app_role,
    created_at timestamptz,
    banned_until timestamptz,
    avatar_url text
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
        p.avatar_url
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    ORDER BY u.created_at DESC;
END;
$$;

-- 6. Re-create the function to retrieve a single user's details with avatar_url.
CREATE OR REPLACE FUNCTION public.get_user_details(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    role public.app_role,
    created_at timestamptz,
    banned_until timestamptz,
    avatar_url text
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
        p.avatar_url
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id
    WHERE u.id = p_user_id;
END;
$$;

