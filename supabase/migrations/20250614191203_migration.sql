
-- Create study_plans table
CREATE TABLE public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    hours_per_week INT NOT NULL,
    plan_content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for the new table
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own study plans
CREATE POLICY "Allow users to read their own study plans"
ON public.study_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy to allow users to create their own study plans
CREATE POLICY "Allow users to create their own study plans"
ON public.study_plans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
