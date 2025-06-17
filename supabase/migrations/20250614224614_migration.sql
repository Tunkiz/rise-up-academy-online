
-- lessons table RLS
-- Allow authenticated users to read lessons
CREATE POLICY "Allow authenticated read on lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage lessons
CREATE POLICY "Allow admin management of lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- quiz_questions table RLS
-- Allow authenticated users to read quiz questions
CREATE POLICY "Allow authenticated read on quiz_questions"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage quiz questions
CREATE POLICY "Allow admin management of quiz_questions"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- quiz_options table RLS
-- Allow authenticated users to read quiz options
CREATE POLICY "Allow authenticated read on quiz_options"
ON public.quiz_options
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage quiz options
CREATE POLICY "Allow admin management of quiz_options"
ON public.quiz_options
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
