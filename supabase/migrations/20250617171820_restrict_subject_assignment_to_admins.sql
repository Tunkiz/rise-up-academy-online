-- Remove the ability for regular users to manage their own subject enrollments
-- Only admins should be able to assign subjects to users

-- First, drop the policy that allows users to manage their own subject registrations
DROP POLICY IF EXISTS "Users can manage their own subject registrations" ON public.user_subjects;

-- Keep the policy that allows users to view their own subject registrations
-- Users still need to see which subjects they are enrolled in
-- But we've removed their ability to add or remove subjects

-- Make sure the admin policy is still in place
DROP POLICY IF EXISTS "Admins can manage all subject registrations" ON public.user_subjects;
CREATE POLICY "Admins can manage all subject registrations" ON public.user_subjects
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Ensure there's a policy that allows users to view their own subjects
DROP POLICY IF EXISTS "Users can view their own subject registrations" ON public.user_subjects;
CREATE POLICY "Users can view their own subject registrations" ON public.user_subjects
FOR SELECT USING (auth.uid() = user_id);