
-- Phase 2: Roles & Permissions (Fixed)

-- Step 1: Add 'super_admin' to the existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Step 2: Create a function to check if current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    );
END;
$$;
COMMENT ON FUNCTION public.is_super_admin() IS 'Checks if the current user has super_admin role - can access all tenants';

-- Step 3: Create a function to check if current user is a tenant admin (within their tenant)
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin' 
        AND ur.tenant_id = public.get_current_tenant_id()
    );
END;
$$;
COMMENT ON FUNCTION public.is_tenant_admin() IS 'Checks if the current user is an admin within their own tenant';

-- Step 4: Update the existing is_admin function to work for both super admin and tenant admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user is super admin (can access everything) OR tenant admin (within their tenant)
    RETURN public.is_super_admin() OR public.is_tenant_admin();
END;
$$;
COMMENT ON FUNCTION public.is_admin() IS 'Checks if user is either super admin or tenant admin within their tenant';

-- Step 5: Drop and recreate the get_all_users function with new return type
DROP FUNCTION IF EXISTS public.get_all_users();

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id uuid, full_name text, email text, role app_role, created_at timestamp with time zone, banned_until timestamp with time zone, avatar_url text, grade integer, subjects jsonb, tenant_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins can access this function
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    -- Super admins can see all users across all tenants
    IF public.is_super_admin() THEN
        RETURN QUERY
        SELECT
            u.id,
            p.full_name,
            u.email::text,
            ur.role,
            u.created_at,
            u.banned_until,
            p.avatar_url,
            p.grade,
            (
                SELECT jsonb_agg(s.*)
                FROM public.user_subjects us
                JOIN public.subjects s ON us.subject_id = s.id
                WHERE us.user_id = u.id
            ) AS subjects,
            t.name AS tenant_name
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        LEFT JOIN public.tenants t ON p.tenant_id = t.id
        ORDER BY u.created_at DESC;
    ELSE
        -- Tenant admins can only see users in their tenant
        RETURN QUERY
        SELECT
            u.id,
            p.full_name,
            u.email::text,
            ur.role,
            u.created_at,
            u.banned_until,
            p.avatar_url,
            p.grade,
            (
                SELECT jsonb_agg(s.*)
                FROM public.user_subjects us
                JOIN public.subjects s ON us.subject_id = s.id
                WHERE us.user_id = u.id
            ) AS subjects,
            t.name AS tenant_name
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        LEFT JOIN public.tenants t ON p.tenant_id = t.id
        WHERE p.tenant_id = public.get_current_tenant_id()
        ORDER BY u.created_at DESC;
    END IF;
END;
$$;

-- Step 6: Create a function specifically for super admins to get tenant statistics
CREATE OR REPLACE FUNCTION public.get_super_admin_stats()
RETURNS TABLE(
    total_tenants_count bigint,
    total_users_across_all_tenants bigint,
    total_active_users_last_30_days bigint,
    tenants_with_stats jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only super admins can access this function
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can access this function.';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.tenants) AS total_tenants_count,
        (SELECT COUNT(*) FROM auth.users) AS total_users_across_all_tenants,
        (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '30 days') AS total_active_users_last_30_days,
        (
            SELECT jsonb_agg(tenant_stats)
            FROM (
                SELECT
                    t.id,
                    t.name,
                    t.created_at,
                    (SELECT COUNT(*) FROM public.profiles p WHERE p.tenant_id = t.id) as user_count,
                    (SELECT COUNT(*) FROM public.subjects s WHERE s.tenant_id = t.id) as subject_count,
                    (SELECT COUNT(*) FROM public.lessons l 
                     JOIN public.topics tp ON l.topic_id = tp.id 
                     WHERE tp.tenant_id = t.id) as lesson_count
                FROM public.tenants t
                ORDER BY t.created_at DESC
            ) tenant_stats
        ) AS tenants_with_stats;
END;
$$;

-- Step 7: Update the existing admin dashboard stats function to be tenant-aware
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS TABLE(total_users_count bigint, new_users_last_30_days bigint, total_subjects_count bigint, total_lessons_count bigint, total_resources_count bigint, total_lessons_completed bigint, total_quizzes_attempted bigint, most_popular_subjects jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_tenant_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can access this function.';
    END IF;

    -- Super admins see global stats, tenant admins see only their tenant stats
    IF public.is_super_admin() THEN
        -- Global stats for super admin
        RETURN QUERY
        SELECT
            (SELECT COUNT(*) FROM auth.users) AS total_users_count,
            (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '30 days') AS new_users_last_30_days,
            (SELECT COUNT(*) FROM public.subjects) AS total_subjects_count,
            (SELECT COUNT(*) FROM public.lessons) AS total_lessons_count,
            (SELECT COUNT(*) FROM public.resources) AS total_resources_count,
            (SELECT COUNT(*) FROM public.lesson_completions) AS total_lessons_completed,
            (SELECT COUNT(*) FROM public.quiz_attempts) AS total_quizzes_attempted,
            (
                SELECT jsonb_agg(pop_subjects)
                FROM (
                    SELECT
                        s.name,
                        s.id,
                        COUNT(us.user_id) as student_count
                    FROM public.subjects s
                    LEFT JOIN public.user_subjects us ON s.id = us.subject_id
                    GROUP BY s.id, s.name
                    ORDER BY student_count DESC
                    LIMIT 5
                ) pop_subjects
            ) AS most_popular_subjects;
    ELSE
        -- Tenant-specific stats for tenant admin
        current_tenant_id := public.get_current_tenant_id();
        
        RETURN QUERY
        SELECT
            (SELECT COUNT(*) FROM public.profiles WHERE tenant_id = current_tenant_id) AS total_users_count,
            (SELECT COUNT(*) FROM auth.users u 
             JOIN public.profiles p ON u.id = p.id 
             WHERE p.tenant_id = current_tenant_id AND u.created_at >= now() - interval '30 days') AS new_users_last_30_days,
            (SELECT COUNT(*) FROM public.subjects WHERE tenant_id = current_tenant_id) AS total_subjects_count,
            (SELECT COUNT(*) FROM public.lessons l 
             JOIN public.topics t ON l.topic_id = t.id 
             WHERE t.tenant_id = current_tenant_id) AS total_lessons_count,
            (SELECT COUNT(*) FROM public.resources WHERE tenant_id = current_tenant_id) AS total_resources_count,
            (SELECT COUNT(*) FROM public.lesson_completions WHERE tenant_id = current_tenant_id) AS total_lessons_completed,
            (SELECT COUNT(*) FROM public.quiz_attempts WHERE tenant_id = current_tenant_id) AS total_quizzes_attempted,
            (
                SELECT jsonb_agg(pop_subjects)
                FROM (
                    SELECT
                        s.name,
                        s.id,
                        COUNT(us.user_id) as student_count
                    FROM public.subjects s
                    LEFT JOIN public.user_subjects us ON s.id = us.subject_id
                    WHERE s.tenant_id = current_tenant_id
                    GROUP BY s.id, s.name
                    ORDER BY student_count DESC
                    LIMIT 5
                ) pop_subjects
            ) AS most_popular_subjects;
    END IF;
END;
$$;
