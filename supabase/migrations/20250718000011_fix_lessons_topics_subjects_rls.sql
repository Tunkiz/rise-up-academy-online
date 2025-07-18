-- Fix RLS policies for lessons, topics, and subjects to allow proper joins in academic data queries
-- These tables need to be accessible for teachers/tutors to view student academic performance

-- Update lessons RLS policy
DROP POLICY IF EXISTS "Lessons are viewable by enrolled users" ON public.lessons;
DROP POLICY IF EXISTS "Users can view lessons in their subjects" ON public.lessons;

CREATE POLICY "Users can view lessons in their subjects"
ON public.lessons
FOR SELECT
USING (
    -- Users can view lessons in subjects they're enrolled in
    EXISTS (
        SELECT 1 
        FROM public.user_subjects us
        JOIN public.topics t ON t.subject_id = us.subject_id
        WHERE us.user_id = auth.uid()
        AND t.id = lessons.topic_id
    )
    OR
    -- Teachers/tutors can view lessons in subjects they teach
    EXISTS (
        SELECT 1 
        FROM public.user_subjects us
        JOIN public.topics t ON t.subject_id = us.subject_id
        JOIN public.user_roles ur ON ur.user_id = us.user_id
        WHERE us.user_id = auth.uid()
        AND ur.role IN ('teacher', 'tutor')
        AND t.id = lessons.topic_id
    )
    OR
    -- Admins can view all lessons in their tenant
    EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
        AND p.tenant_id = lessons.tenant_id
    )
);

-- Update topics RLS policy
DROP POLICY IF EXISTS "Topics are viewable by enrolled users" ON public.topics;
DROP POLICY IF EXISTS "Users can view topics in their subjects" ON public.topics;

CREATE POLICY "Users can view topics in their subjects"
ON public.topics
FOR SELECT
USING (
    -- Users can view topics in subjects they're enrolled in
    EXISTS (
        SELECT 1 
        FROM public.user_subjects us
        WHERE us.user_id = auth.uid()
        AND us.subject_id = topics.subject_id
    )
    OR
    -- Teachers/tutors can view topics in subjects they teach
    EXISTS (
        SELECT 1 
        FROM public.user_subjects us
        JOIN public.user_roles ur ON ur.user_id = us.user_id
        WHERE us.user_id = auth.uid()
        AND ur.role IN ('teacher', 'tutor')
        AND us.subject_id = topics.subject_id
    )
    OR
    -- Admins can view all topics in their tenant
    EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
        AND p.tenant_id = topics.tenant_id
    )
);

-- Update subjects RLS policy  
DROP POLICY IF EXISTS "Subjects are viewable by enrolled users" ON public.subjects;
DROP POLICY IF EXISTS "Users can view their enrolled subjects" ON public.subjects;

CREATE POLICY "Users can view their enrolled subjects"
ON public.subjects
FOR SELECT
USING (
    -- Users can view subjects they're enrolled in
    EXISTS (
        SELECT 1 
        FROM public.user_subjects us
        WHERE us.user_id = auth.uid()
        AND us.subject_id = subjects.id
    )
    OR
    -- Teachers/tutors can view subjects they teach
    EXISTS (
        SELECT 1 
        FROM public.user_subjects us
        JOIN public.user_roles ur ON ur.user_id = us.user_id
        WHERE us.user_id = auth.uid()
        AND ur.role IN ('teacher', 'tutor')
        AND us.subject_id = subjects.id
    )
    OR
    -- Admins can view all subjects in their tenant
    EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
        AND p.tenant_id = subjects.tenant_id
    )
);
