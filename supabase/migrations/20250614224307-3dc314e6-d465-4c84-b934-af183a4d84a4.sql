
-- Allow read access for authenticated users, as topics will be visible in the learning portal.
CREATE POLICY "Allow authenticated users to read topics"
ON public.topics
FOR SELECT
TO authenticated
USING (true);

-- Policy: Admins can insert topics
CREATE POLICY "Allow admin to insert topics"
ON public.topics
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy: Admins can update topics
CREATE POLICY "Allow admin to update topics"
ON public.topics
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Policy: Admins can delete topics
CREATE POLICY "Allow admin to delete topics"
ON public.topics
FOR DELETE
TO authenticated
USING (public.is_admin());
