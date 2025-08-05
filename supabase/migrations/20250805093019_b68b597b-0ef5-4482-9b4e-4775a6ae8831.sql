-- Remove single category field from subjects table since we want multiple categories
ALTER TABLE public.subjects DROP COLUMN IF EXISTS category;

-- Create subject_grades table for many-to-many relationship between subjects and grades
CREATE TABLE IF NOT EXISTS public.subject_grades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL,
    grade INTEGER NOT NULL,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(subject_id, grade)
);

-- Create teacher_grades table for many-to-many relationship between teachers and grades
CREATE TABLE IF NOT EXISTS public.teacher_grades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL,
    grade INTEGER NOT NULL,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(teacher_id, grade)
);

-- Enable RLS on new tables
ALTER TABLE public.subject_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_grades ENABLE ROW LEVEL SECURITY;

-- RLS policies for subject_grades
CREATE POLICY "Authenticated users can view subject grades"
ON public.subject_grades
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage subject grades in their tenant"
ON public.subject_grades
FOR ALL
USING (is_admin() AND tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());

-- RLS policies for teacher_grades
CREATE POLICY "Authenticated users can view teacher grades"
ON public.teacher_grades
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage teacher grades in their tenant"
ON public.teacher_grades
FOR ALL
USING (is_admin() AND tenant_id = get_current_tenant_id())
WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Teachers can view their own grades"
ON public.teacher_grades
FOR SELECT
USING (teacher_id = auth.uid());