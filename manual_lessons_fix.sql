-- SQL Commands to run in Supabase SQL Editor
-- Run these one by one to add created_by column to lessons table

-- Step 1: Check if created_by column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lessons' AND table_schema = 'public';

-- Step 2: Add created_by column if it doesn't exist
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS created_by UUID;

-- Step 3: Add tenant_id column if it doesn't exist
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Step 4: Add foreign key constraints (with proper syntax)
DO $$ 
BEGIN
    -- Add created_by foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lessons_created_by_fkey' 
        AND table_name = 'lessons'
    ) THEN
        ALTER TABLE public.lessons 
        ADD CONSTRAINT lessons_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add tenant_id foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lessons_tenant_id_fkey' 
        AND table_name = 'lessons'
    ) THEN
        ALTER TABLE public.lessons 
        ADD CONSTRAINT lessons_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Update RLS policies
DROP POLICY IF EXISTS "Users can view lessons in their tenant" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons in their tenant" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons in their tenant" ON public.lessons;

CREATE POLICY "Users can view lessons in their tenant" ON public.lessons
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage their own lessons" ON public.lessons
    FOR ALL USING (
        created_by = auth.uid() AND
        tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all lessons in their tenant" ON public.lessons
    FOR ALL USING (
        tenant_id IN (
            SELECT p.tenant_id FROM public.profiles p
            JOIN public.user_roles ur ON p.id = ur.user_id
            WHERE p.id = auth.uid() AND ur.role IN ('admin', 'super_admin')
        )
    );

-- Step 6: Check current lessons and their data
SELECT id, title, created_by, tenant_id FROM public.lessons;
