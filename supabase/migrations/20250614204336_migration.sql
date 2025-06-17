
-- Drop existing permissive read policies
DROP POLICY "Allow read access to quiz questions and options" ON public.quiz_questions;
DROP POLICY "Allow read access to quiz options" ON public.quiz_options;

-- Policy: Allow authenticated users to read quiz questions and options
CREATE POLICY "Allow authenticated users to read quiz questions"
ON public.quiz_questions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read quiz options"
ON public.quiz_options FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Allow admins to manage quiz questions
CREATE POLICY "Admins can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy: Allow admins to manage quiz options
CREATE POLICY "Admins can manage quiz options"
ON public.quiz_options
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
