-- Fix RLS policies for academic data access
-- This migration ensures teachers/tutors can view academic data for their students

-- First, drop existing policies that might conflict
DROP POLICY IF EXISTS "Users and teachers can view quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users and teachers can view lesson completions" ON public.lesson_completions;
DROP POLICY IF EXISTS "Users and teachers can view student progress" ON public.student_progress;
DROP POLICY IF EXISTS "Teachers can view lessons in their subjects" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can view topics in their subjects" ON public.topics;
DROP POLICY IF EXISTS "Teachers can view their subjects" ON public.subjects;

-- Enable RLS on all relevant tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Quiz attempts policy
CREATE POLICY "Users and teachers can view quiz attempts"
ON public.quiz_attempts
FOR SELECT
USING (
    -- Users can view their own attempts
    auth.uid() = user_id
    OR
    -- Teachers/tutors can view attempts from students in their subjects
    (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('teacher', 'tutor')
        )
        AND
        EXISTS (
            -- Check if the teacher shares any subjects with the student who made the attempt
            SELECT 1
            FROM public.user_subjects teacher_us
            JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
            WHERE teacher_us.user_id = auth.uid()
            AND student_us.user_id = quiz_attempts.user_id
        )
    )
    OR
    -- Admins can view all attempts in their tenant
    (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
        AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = quiz_attempts.tenant_id
        )
    )
);

-- Lesson completions policy
CREATE POLICY "Users and teachers can view lesson completions"
ON public.lesson_completions
FOR SELECT
USING (
    -- Users can view their own completions
    auth.uid() = user_id
    OR
    -- Teachers/tutors can view completions from students in their subjects
    (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('teacher', 'tutor')
        )
        AND
        EXISTS (
            -- Check if the teacher shares any subjects with the student
            SELECT 1
            FROM public.user_subjects teacher_us
            JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
            WHERE teacher_us.user_id = auth.uid()
            AND student_us.user_id = lesson_completions.user_id
        )
    )
    OR
    -- Admins can view all completions in their tenant
    (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
        AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = lesson_completions.tenant_id
        )
    )
);

-- Student progress policy
CREATE POLICY "Users and teachers can view student progress"
ON public.student_progress
FOR SELECT
USING (
    -- Users can view their own progress
    auth.uid() = user_id
    OR
    -- Teachers/tutors can view progress from students in their subjects
    (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('teacher', 'tutor')
        )
        AND
        EXISTS (
            -- Check if the teacher shares any subjects with the student
            SELECT 1
            FROM public.user_subjects teacher_us
            JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
            WHERE teacher_us.user_id = auth.uid()
            AND student_us.user_id = student_progress.user_id
        )
    )
    OR
    -- Admins can view all progress in their tenant
    (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
        AND
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.tenant_id = student_progress.tenant_id
        )
    )
);

-- Lessons policy - allow teachers to view lessons in subjects they teach
CREATE POLICY "Teachers can view lessons in their subjects"
ON public.lessons
FOR SELECT
USING (
    -- Users with teacher/tutor/admin roles can view lessons
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('teacher', 'tutor', 'admin')
    )
    AND
    (
        -- Teachers/tutors can view lessons in subjects they teach
        EXISTS (
            SELECT 1 
            FROM public.user_subjects us
            JOIN public.topics t ON us.subject_id = t.subject_id
            WHERE us.user_id = auth.uid()
            AND t.id = lessons.topic_id
        )
        OR
        -- Admins can view all lessons in their tenant
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.profiles p ON ur.user_id = p.id
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
            AND p.tenant_id = lessons.tenant_id
        )
    )
);

-- Topics policy - allow teachers to view topics in subjects they teach
CREATE POLICY "Teachers can view topics in their subjects"
ON public.topics
FOR SELECT
USING (
    -- Users with teacher/tutor/admin roles can view topics
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('teacher', 'tutor', 'admin')
    )
    AND
    (
        -- Teachers/tutors can view topics in subjects they teach
        EXISTS (
            SELECT 1 
            FROM public.user_subjects us
            WHERE us.user_id = auth.uid()
            AND us.subject_id = topics.subject_id
        )
        OR
        -- Admins can view all topics in their tenant
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.profiles p ON ur.user_id = p.id
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
            AND p.tenant_id = topics.tenant_id
        )
    )
);

-- Subjects policy - allow teachers to view subjects they teach
CREATE POLICY "Teachers can view their subjects"
ON public.subjects
FOR SELECT
USING (
    -- Users with teacher/tutor/admin roles can view subjects
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('teacher', 'tutor', 'admin')
    )
    AND
    (
        -- Teachers/tutors can view subjects they teach
        EXISTS (
            SELECT 1 
            FROM public.user_subjects us
            WHERE us.user_id = auth.uid()
            AND us.subject_id = subjects.id
        )
        OR
        -- Admins can view all subjects in their tenant
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.profiles p ON ur.user_id = p.id
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
            AND p.tenant_id = subjects.tenant_id
        )
    )
);
