-- Add created_by and tenant_id columns to lessons table if they don't exist
DO $$ 
BEGIN
    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN created_by UUID;
    END IF;
    
    -- Add tenant_id column if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Add foreign key constraint for created_by if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lessons_created_by_fkey'
    ) THEN
        ALTER TABLE public.lessons 
        ADD CONSTRAINT lessons_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for tenant_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lessons_tenant_id_fkey'
    ) THEN
        ALTER TABLE public.lessons 
        ADD CONSTRAINT lessons_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update RLS policies for lessons table
DROP POLICY IF EXISTS "Users can view lessons in their tenant" ON public.lessons;
DROP POLICY IF EXISTS "Teachers can manage lessons in their tenant" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons in their tenant" ON public.lessons;

-- Create new RLS policies
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
            SELECT tenant_id FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Populate created_by and tenant_id for existing lessons (if any)
-- This will set created_by to null for existing lessons, which is expected
-- Teachers will need to create new lessons or have existing ones assigned to them
UPDATE public.lessons 
SET tenant_id = (
    SELECT tenant_id FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1
)
WHERE tenant_id IS NULL;
