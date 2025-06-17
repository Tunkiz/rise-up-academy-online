
-- Drop the current policy which only allows users to see their own profile
DROP POLICY "Allow users to view their own profile" ON public.profiles;

-- Create a new policy that allows admins to view any profile, and users to view their own
CREATE POLICY "Allow admins to view any and users to view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR is_admin());
