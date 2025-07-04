-- Add learner category to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learner_category public.subject_category;

-- Update existing profiles to have a default category
UPDATE public.profiles 
SET learner_category = 'national_senior' 
WHERE learner_category IS NULL;

-- Make learner_category required for new profiles
ALTER TABLE public.profiles ALTER COLUMN learner_category SET NOT NULL;

-- Create function to update user learner category (admin only)
CREATE OR REPLACE FUNCTION public.update_user_learner_category(target_user_id uuid, new_category public.subject_category)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can update learner categories.';
    END IF;

    UPDATE public.profiles
    SET learner_category = new_category
    WHERE id = target_user_id;
END;
$$;