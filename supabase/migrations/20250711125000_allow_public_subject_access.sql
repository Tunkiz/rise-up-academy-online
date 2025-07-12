-- Allow public read access to subjects for registration purposes
-- This is needed because during registration, users are not authenticated yet
-- but they need to see available subjects to select from

-- Add a policy to allow public read access to subjects
CREATE POLICY "Public users can view subjects for registration"
ON public.subjects
FOR SELECT
USING (true);

-- Add a policy to allow public read access to subject_categories for registration
CREATE POLICY "Public users can view subject categories for registration"
ON public.subject_categories
FOR SELECT
USING (true);

-- Comment explaining the security consideration
COMMENT ON POLICY "Public users can view subjects for registration" ON public.subjects IS 'Allows unauthenticated users to view subjects during registration process';
COMMENT ON POLICY "Public users can view subject categories for registration" ON public.subject_categories IS 'Allows unauthenticated users to view subject categories during registration process';
