-- Fix teacher permissions for deleting/managing topics, lessons, and resources
-- Run these comma-- Check if created_by column exists in resources table and add it if needed
DO $$ 
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.resources ADD COLUMN created_by UUID;
        
        -- Add foreign key constraint
        ALTER TABLE public.resources 
        ADD CONSTRAINT resources_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create new comprehensive policies for lessonsL Editor

-- 1. Drop ALL existing policies for lessons table first
DROP POLICY IF EXISTS "Users can view lessons in their tenant" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can create lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can update their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can delete their own lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons in their tenant" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons in their tenant" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated users can view lessons" ON public.lessons;

-- Create comprehensive lesson policies for teachers
CREATE POLICY "Teachers can create lessons" ON public.lessons
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('teacher', 'tutor')
        ) AND
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update their own lessons" ON public.lessons
    FOR UPDATE USING (
        created_by = auth.uid() AND
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete their own lessons" ON public.lessons
    FOR DELETE USING (
        created_by = auth.uid() AND
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. Drop ALL existing policies for topics table first
DROP POLICY IF EXISTS "Users can view topics in their tenant" ON public.topics;
DROP POLICY IF EXISTS "Teachers can manage topics in their tenant" ON public.topics;
DROP POLICY IF EXISTS "Teachers can create topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers can update topics" ON public.topics;
DROP POLICY IF EXISTS "Teachers can delete topics" ON public.topics;
DROP POLICY IF EXISTS "Admins can manage all topics in their tenant" ON public.topics;
DROP POLICY IF EXISTS "Authenticated users can view topics" ON public.topics;

-- 5. Create new comprehensive policies for topics
CREATE POLICY "Teachers can create topics" ON public.topics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('teacher', 'tutor')
        ) AND
        subject_id IN (
            SELECT s.id FROM public.subjects s
            JOIN public.user_subjects us ON s.id = us.subject_id
            WHERE us.user_id = auth.uid() AND s.tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Teachers can update topics in their subjects" ON public.topics
    FOR UPDATE USING (
        subject_id IN (
            SELECT s.id FROM public.subjects s
            JOIN public.user_subjects us ON s.id = us.subject_id
            WHERE us.user_id = auth.uid() AND s.tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Teachers can delete topics in their subjects" ON public.topics
    FOR DELETE USING (
        subject_id IN (
            SELECT s.id FROM public.subjects s
            JOIN public.user_subjects us ON s.id = us.subject_id
            WHERE us.user_id = auth.uid() AND s.tenant_id IN (
                SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- 3. Drop ALL existing policies for resources table first
DROP POLICY IF EXISTS "Users can view resources in their tenant" ON public.resources;
DROP POLICY IF EXISTS "Teachers can manage resources in their tenant" ON public.resources;
DROP POLICY IF EXISTS "Teachers can create resources" ON public.resources;
DROP POLICY IF EXISTS "Teachers can update resources" ON public.resources;
DROP POLICY IF EXISTS "Teachers can delete resources" ON public.resources;
DROP POLICY IF EXISTS "Admins can manage all resources in their tenant" ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can view resources" ON public.resources;

-- Check if created_by column exists in resources table
DO $$ 
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resources' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.resources ADD COLUMN created_by UUID;
        
        -- Add foreign key constraint
        ALTER TABLE public.resources 
        ADD CONSTRAINT resources_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. Create new comprehensive policies for resources
CREATE POLICY "Teachers can create resources" ON public.resources
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('teacher', 'tutor')
        ) AND
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update their own resources" ON public.resources
    FOR UPDATE USING (
        created_by = auth.uid() AND
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Teachers can delete their own resources" ON public.resources
    FOR DELETE USING (
        created_by = auth.uid() AND
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 7. Create admin policies (recreate admin functionality)
CREATE POLICY "Admins can manage all lessons in their tenant" ON public.lessons
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id FROM public.profiles p
            JOIN public.user_roles ur ON p.id = ur.user_id
            WHERE p.id = auth.uid() AND ur.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can manage all topics in their tenant" ON public.topics
    FOR ALL USING (
        subject_id IN (
            SELECT s.id FROM public.subjects s
            WHERE s.tenant_id IN (
                SELECT p.tenant_id FROM public.profiles p
                JOIN public.user_roles ur ON p.id = ur.user_id
                WHERE p.id = auth.uid() AND ur.role IN ('admin', 'super_admin')
            )
        )
    );

CREATE POLICY "Admins can manage all resources in their tenant" ON public.resources
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id FROM public.profiles p
            JOIN public.user_roles ur ON p.id = ur.user_id
            WHERE p.id = auth.uid() AND ur.role IN ('admin', 'super_admin')
        )
    );

-- 8. Check current data
SELECT 'Lessons' as table_name, id, title, created_by, tenant_id FROM public.lessons
UNION ALL
SELECT 'Resources' as table_name, id, title, created_by, tenant_id FROM public.resources
ORDER BY table_name, id;
