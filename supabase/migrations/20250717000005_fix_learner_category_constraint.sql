-- Fix learner_category constraint to allow NULL for teachers/tutors
ALTER TABLE public.profiles ALTER COLUMN learner_category DROP NOT NULL;
