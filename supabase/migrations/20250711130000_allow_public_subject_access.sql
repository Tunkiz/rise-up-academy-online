-- Allow public read access to subjects and subject_categories for registration
-- This is needed for unauthenticated users to see available subjects during registration

-- Add public read policy for subjects
CREATE POLICY "Public can view subjects for registration"
ON public.subjects
FOR SELECT
USING (true);

-- Add public read policy for subject_categories
CREATE POLICY "Public can view subject categories for registration"
ON public.subject_categories
FOR SELECT
USING (true);
