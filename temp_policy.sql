DO supabase/migrations/20250711131000_safe_public_subject_access.sql BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND schemaname = 'public' AND policyname = 'Public can view subjects for registration') THEN CREATE POLICY \
Public
can
view
subjects
for
registration\ ON public.subjects FOR SELECT USING (true); END IF; END supabase/migrations/20250711131000_safe_public_subject_access.sql;
