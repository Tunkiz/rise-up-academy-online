
-- Drop the existing permissive policy that allows any user to see all profiles
DROP POLICY "Allow authenticated users to view profiles" ON public.profiles;

-- Create a new, more secure policy that only allows users to view their own profile
CREATE POLICY "Allow users to view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
