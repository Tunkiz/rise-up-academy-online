
DO $$
DECLARE
    legacy_tenant_id UUID;
BEGIN
    -- Step 1: Create a default tenant for all existing data and get its ID.
    INSERT INTO public.tenants (name) VALUES ('Legacy Academy') RETURNING id INTO legacy_tenant_id;

    -- Step 2: Backfill tenant_id for all existing data. This assigns all current data to the "Legacy Academy".
    UPDATE public.profiles SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.subjects SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.topics SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.lessons SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.resources SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.student_progress SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.deadlines SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.recent_activity SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.user_roles SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.lesson_completions SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.quiz_attempts SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.study_plans SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.tutor_notes SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.class_schedules SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    UPDATE public.user_subjects SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;

    -- Step 3: Now that all data is migrated, enforce that tenant_id can never be null.
    ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.subjects ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.topics ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.lessons ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.resources ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.student_progress ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.deadlines ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.recent_activity ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.user_roles ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.lesson_completions ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.quiz_attempts ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.study_plans ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.tutor_notes ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.class_schedules ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE public.user_subjects ALTER COLUMN tenant_id SET NOT NULL;

    -- Step 4: Apply new tenant-aware Row-Level Security (RLS) policies.
    
    -- Enable RLS on the new `tenants` table itself
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Tenant members can read their own tenant info" ON public.tenants FOR SELECT USING (id = public.get_current_tenant_id());
    CREATE POLICY "Tenant admins can update their own tenant" ON public.tenants FOR UPDATE USING (id = public.get_current_tenant_id() AND public.is_admin()) WITH CHECK (id = public.get_current_tenant_id());

    -- PROFILES
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
    CREATE POLICY "Users can view and update their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
    CREATE POLICY "Admins can view profiles in their tenant" ON public.profiles FOR SELECT USING (tenant_id = public.get_current_tenant_id() AND public.is_admin());

    -- SUBJECTS
    ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Tenant members can read subjects" ON public.subjects FOR SELECT USING (tenant_id = public.get_current_tenant_id());
    CREATE POLICY "Tenant admins can manage subjects" ON public.subjects FOR ALL USING (tenant_id = public.get_current_tenant_id() AND public.is_admin()) WITH CHECK (tenant_id = public.get_current_tenant_id());

    -- TOPICS
    ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Tenant members can read topics" ON public.topics FOR SELECT USING (tenant_id = public.get_current_tenant_id());
    CREATE POLICY "Tenant admins can manage topics" ON public.topics FOR ALL USING (tenant_id = public.get_current_tenant_id() AND public.is_admin()) WITH CHECK (tenant_id = public.get_current_tenant_id());

    -- LESSONS
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.lessons;
    DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
    CREATE POLICY "Tenant members can read lessons" ON public.lessons FOR SELECT USING (tenant_id = public.get_current_tenant_id());
    CREATE POLICY "Tenant admins can manage lessons" ON public.lessons FOR ALL USING (tenant_id = public.get_current_tenant_id() AND public.is_admin()) WITH CHECK (tenant_id = public.get_current_tenant_id());
    
    -- QUIZ QUESTIONS (access via lesson)
    DROP POLICY IF EXISTS "Allow authenticated users to read quiz questions" ON public.quiz_questions;
    DROP POLICY IF EXISTS "Admins can manage quiz questions" ON public.quiz_questions;
    CREATE POLICY "Tenant members can read quiz questions" ON public.quiz_questions FOR SELECT USING (EXISTS (SELECT 1 FROM lessons WHERE id = quiz_questions.lesson_id AND tenant_id = public.get_current_tenant_id()));
    CREATE POLICY "Tenant admins can manage quiz questions" ON public.quiz_questions FOR ALL USING (EXISTS (SELECT 1 FROM lessons WHERE id = quiz_questions.lesson_id AND tenant_id = public.get_current_tenant_id() AND public.is_admin())) WITH CHECK (EXISTS (SELECT 1 FROM lessons WHERE id = quiz_questions.lesson_id AND tenant_id = public.get_current_tenant_id()));

    -- QUIZ OPTIONS (access via question -> lesson)
    DROP POLICY IF EXISTS "Allow authenticated users to read quiz options" ON public.quiz_options;
    DROP POLICY IF EXISTS "Admins can manage quiz options" ON public.quiz_options;
    CREATE POLICY "Tenant members can read quiz options" ON public.quiz_options FOR SELECT USING (EXISTS (SELECT 1 FROM quiz_questions q JOIN lessons l ON q.lesson_id = l.id WHERE q.id = quiz_options.question_id AND l.tenant_id = public.get_current_tenant_id()));
    CREATE POLICY "Tenant admins can manage quiz options" ON public.quiz_options FOR ALL USING (EXISTS (SELECT 1 FROM quiz_questions q JOIN lessons l ON q.lesson_id = l.id WHERE q.id = quiz_options.question_id AND l.tenant_id = public.get_current_tenant_id() AND public.is_admin())) WITH CHECK (EXISTS (SELECT 1 FROM quiz_questions q JOIN lessons l ON q.lesson_id = l.id WHERE q.id = quiz_options.question_id AND l.tenant_id = public.get_current_tenant_id()));

    -- RESOURCES
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.resources;
    DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
    CREATE POLICY "Tenant members can read resources" ON public.resources FOR SELECT USING (tenant_id = public.get_current_tenant_id());
    CREATE POLICY "Tenant admins can manage resources" ON public.resources FOR ALL USING (tenant_id = public.get_current_tenant_id() AND public.is_admin()) WITH CHECK (tenant_id = public.get_current_tenant_id());
    
    -- USER_SUBJECTS
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_subjects;
    CREATE POLICY "Users can view their own subject enrollments" ON public.user_subjects FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "Admins can manage enrollments in their tenant" ON public.user_subjects FOR ALL USING (tenant_id = public.get_current_tenant_id() AND public.is_admin()) WITH CHECK (tenant_id = public.get_current_tenant_id());

    -- STUDY_PLANS (per-user, but scoped to tenant)
    DROP POLICY IF EXISTS "Allow users to read their own study plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Allow users to create their own study plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Allow users to update their own study plans" ON public.study_plans;
    DROP POLICY IF EXISTS "Allow users to delete their own study plans" ON public.study_plans;
    CREATE POLICY "Users can manage their own study plans" ON public.study_plans FOR ALL USING (user_id = auth.uid() AND tenant_id = public.get_current_tenant_id()) WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_current_tenant_id());

    -- TUTOR_NOTES (per-user, but scoped to tenant)
    DROP POLICY IF EXISTS "Users can view their own notes" ON public.tutor_notes;
    DROP POLICY IF EXISTS "Users can create their own notes" ON public.tutor_notes;
    DROP POLICY IF EXISTS "Users can delete their own notes" ON public.tutor_notes;
    DROP POLICY IF EXISTS "Users can update their own notes" ON public.tutor_notes;
    CREATE POLICY "Users can manage their own tutor notes" ON public.tutor_notes FOR ALL USING (user_id = auth.uid() AND tenant_id = public.get_current_tenant_id()) WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_current_tenant_id());

    -- EXAMS (Public within any tenant)
    DROP POLICY IF EXISTS "Allow authenticated read access to exams" ON public.exams;
    CREATE POLICY "Authenticated users can read exams" ON public.exams FOR SELECT USING (auth.role() = 'authenticated');
    -- Note: Exams are not tenant-specific in this model.

END $$;
