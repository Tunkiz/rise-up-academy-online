
-- Add an updated_at column to track plan modifications
ALTER TABLE public.study_plans ADD COLUMN updated_at TIMESTAMPTZ;

-- Create a trigger function to automatically update the updated_at timestamp on any change
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach the trigger to the study_plans table
CREATE TRIGGER update_study_plans_updated_at
BEFORE UPDATE ON public.study_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add a policy to allow users to update their own study plans
CREATE POLICY "Allow users to update their own study plans"
ON public.study_plans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add a policy to allow users to delete their own study plans for security completeness
CREATE POLICY "Allow users to delete their own study plans"
ON public.study_plans
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
