-- Add created_by column to lessons table
ALTER TABLE public.lessons ADD COLUMN created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Add tenant_id column to lessons table for consistency
ALTER TABLE public.lessons ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- Backfill tenant_id for existing lessons by joining through topics and subjects
UPDATE public.lessons 
SET tenant_id = subjects.tenant_id
FROM public.topics 
JOIN public.subjects ON topics.subject_id = subjects.id
WHERE lessons.topic_id = topics.id;

-- Make tenant_id NOT NULL after backfilling
ALTER TABLE public.lessons ALTER COLUMN tenant_id SET NOT NULL;

-- Update RLS policies for lessons to include tenant filtering
DROP POLICY IF EXISTS "Authenticated users can view lessons" ON public.lessons;

CREATE POLICY "Users can view lessons in their tenant"
ON public.lessons
FOR SELECT
USING (
  auth.role() = 'authenticated' AND 
  tenant_id IN (
    SELECT p.tenant_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);

-- Allow teachers/tutors to create lessons
CREATE POLICY "Teachers can create lessons"
ON public.lessons
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('teacher', 'tutor')
  ) AND
  tenant_id IN (
    SELECT p.tenant_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);

-- Allow teachers/tutors to update their own lessons
CREATE POLICY "Teachers can update their own lessons"
ON public.lessons
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('teacher', 'tutor')
  )
);

-- Allow teachers/tutors to delete their own lessons
CREATE POLICY "Teachers can delete their own lessons"
ON public.lessons
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('teacher', 'tutor')
  )
);
