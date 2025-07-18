-- Create a function to add teachers and tutors (admin only)

-- Create teacher categories table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.teacher_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category public.subject_category NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(teacher_id, category)
);

-- Enable RLS on teacher_categories
ALTER TABLE public.teacher_categories ENABLE ROW LEVEL SECURITY;

-- Policy for teacher_categories (teachers can view their own, admins can view all)
CREATE POLICY "Teachers can view their own categories" ON public.teacher_categories
FOR SELECT TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

CREATE POLICY "Teachers can manage their own categories" ON public.teacher_categories
FOR ALL TO authenticated
USING (
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

CREATE OR REPLACE FUNCTION public.create_teacher_or_tutor(
    p_email text,
    p_full_name text,
    p_role public.app_role,
    p_temporary_password text,
    p_tenant_id uuid
)
RETURNS TABLE(user_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_calling_user_id uuid;
    v_calling_user_role public.app_role;
    v_tenant_id uuid;
BEGIN
    -- Get the calling user's ID from JWT
    v_calling_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_calling_user_id IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Authentication required'::text;
        RETURN;
    END IF;

    -- Get the calling user's role and tenant
    SELECT ur.role, p.tenant_id INTO v_calling_user_role, v_tenant_id
    FROM public.profiles p 
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = v_calling_user_id;

    -- Only admins can create teachers/tutors
    IF v_calling_user_role != 'admin' THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Admin access required'::text;
        RETURN;
    END IF;

    -- Validate role parameter (must be teacher or tutor)
    IF p_role NOT IN ('teacher', 'tutor') THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Invalid role. Must be teacher or tutor'::text;
        RETURN;
    END IF;

    -- Validate email format (basic check)
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Invalid email format'::text;
        RETURN;
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RETURN QUERY SELECT NULL::uuid, false, 'User with this email already exists'::text;
        RETURN;
    END IF;

    -- Use the provided tenant_id or default to the admin's tenant
    IF p_tenant_id IS NOT NULL THEN
        v_tenant_id := p_tenant_id;
    END IF;

    -- Validate tenant exists
    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant_id) THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Invalid tenant'::text;
        RETURN;
    END IF;

    -- Create the user in auth.users (this requires admin privileges)
    -- Note: In production, this should be done via Supabase Admin API
    -- For now, we'll create a profile record and rely on the admin to handle auth creation
    
    -- Generate a UUID for the new user
    v_user_id := gen_random_uuid();

    -- Create profile record (teachers/tutors don't need a specific learner_category)
    INSERT INTO public.profiles (
        id,
        full_name,
        tenant_id,
        learner_category
    ) VALUES (
        v_user_id,
        p_full_name,
        v_tenant_id,
        CASE 
            WHEN p_role IN ('teacher', 'tutor') THEN NULL
            ELSE 'national_senior'::public.subject_category
        END
    );

    -- Create user role record
    INSERT INTO public.user_roles (
        user_id,
        role,
        tenant_id
    ) VALUES (
        v_user_id,
        p_role,
        v_tenant_id
    );

    -- Log the creation
    INSERT INTO public.user_activity_logs (
        user_id,
        activity_type,
        description,
        created_at
    ) VALUES (
        v_calling_user_id,
        'user_creation',
        format('Created %s account for %s (%s)', p_role, p_full_name, p_email),
        now()
    );

    RETURN QUERY SELECT v_user_id, true, 'User created successfully'::text;
END;
$$;

-- Grant execute permission to authenticated users (will be restricted by function logic)
GRANT EXECUTE ON FUNCTION public.create_teacher_or_tutor TO authenticated;

-- Create user activity logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for user_activity_logs (only admins can view)
CREATE POLICY "Admins can view user activity logs" ON public.user_activity_logs
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);
