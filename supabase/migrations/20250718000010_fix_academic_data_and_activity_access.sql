-- Fix RLS policies and functions to allow teachers/tutors to view student academic data
-- This is a combined migration to fix both RLS policies and the get_user_activity function

-- Update quiz_attempts RLS policy to allow teachers/tutors access
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Teachers can view student quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users and teachers can view quiz attempts" ON public.quiz_attempts;

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

-- Update lesson_completions RLS policy to allow teachers/tutors access
DROP POLICY IF EXISTS "Users can view their own lesson completions" ON public.lesson_completions;
DROP POLICY IF EXISTS "Teachers can view student lesson completions" ON public.lesson_completions;
DROP POLICY IF EXISTS "Users and teachers can view lesson completions" ON public.lesson_completions;

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
            -- Check if the teacher shares any subjects with the student who completed the lesson
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

-- Update student_progress RLS policy
DROP POLICY IF EXISTS "Users can view their own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Teachers can view student progress" ON public.student_progress;
DROP POLICY IF EXISTS "Users and teachers can view student progress" ON public.student_progress;

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

-- Fix get_user_activity function to allow teachers/tutors to access student activity data
CREATE OR REPLACE FUNCTION public.get_user_activity(p_user_id uuid)
RETURNS TABLE(id uuid, activity text, course text, date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_role public.app_role;
    current_tenant_id UUID;
    target_tenant_id UUID;
    is_teacher_student BOOLEAN := FALSE;
BEGIN
    -- Get current user's role
    SELECT ur.role INTO current_user_role
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid();

    -- Check if user has permission
    IF current_user_role IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Get tenant information
    SELECT p.tenant_id INTO target_tenant_id
    FROM public.profiles p
    WHERE p.id = p_user_id;

    SELECT public.get_current_tenant_id() INTO current_tenant_id;

    -- Super admins can view any user's activity
    IF public.is_super_admin() THEN
        -- Super admin access - no restrictions
    ELSIF current_user_role = 'admin' THEN
        -- Tenant admins can view users in their tenant
        IF target_tenant_id != current_tenant_id THEN
            RAISE EXCEPTION 'You can only view users in your organization.';
        END IF;
    ELSIF current_user_role IN ('teacher', 'tutor') THEN
        -- Teachers and tutors can only view activity for students in their subjects within their tenant
        IF target_tenant_id != current_tenant_id THEN
            RAISE EXCEPTION 'You can only view users in your organization.';
        END IF;

        -- Allow viewing their own activity
        IF p_user_id = auth.uid() THEN
            is_teacher_student := TRUE;
        ELSE
            -- Check if the target user is a student enrolled in teacher's subjects
            SELECT EXISTS (
                SELECT 1
                FROM public.user_subjects teacher_us
                JOIN public.user_subjects student_us ON teacher_us.subject_id = student_us.subject_id
                WHERE teacher_us.user_id = auth.uid()
                AND student_us.user_id = p_user_id
            ) INTO is_teacher_student;
        END IF;

        -- If not their own activity and not a student in their subjects, deny access
        IF NOT is_teacher_student THEN
            RAISE EXCEPTION 'You can only view activity for students enrolled in your subjects.';
        END IF;
    ELSIF current_user_role = 'student' THEN
        -- Students can only view their own activity
        IF p_user_id != auth.uid() THEN
            RAISE EXCEPTION 'You can only view your own activity.';
        END IF;
    ELSE
        RAISE EXCEPTION 'Insufficient permissions.';
    END IF;

    RETURN QUERY
    SELECT
        ra.id,
        ra.activity,
        ra.course,
        ra.date
    FROM public.recent_activity ra
    WHERE ra.user_id = p_user_id
    ORDER BY ra.date DESC
    LIMIT 15;
END;
$$;
