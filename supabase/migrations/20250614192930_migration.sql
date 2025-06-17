
-- 1. Create an ENUM type for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create a table to assign roles to users
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 3. Create a table for resources
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT, -- This will store the public URL of the file from Storage
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- 4. Create a storage bucket for resource files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resource_files', 'resource_files', TRUE, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- 5. Helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 6. RLS Policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- 7. RLS Policies for resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view resources"
ON public.resources
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage resources"
ON public.resources
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 8. RLS Policies for subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view subjects"
ON public.subjects
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage subjects"
ON public.subjects
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 9. RLS for student_progress
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own progress"
ON public.student_progress
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. Storage policies for resource_files
CREATE POLICY "Allow public read access to resource files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'resource_files');

CREATE POLICY "Allow admins to manage resource files"
ON storage.objects
FOR ALL
USING (bucket_id = 'resource_files' AND public.is_admin());
