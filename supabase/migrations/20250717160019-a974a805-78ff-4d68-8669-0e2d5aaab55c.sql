-- Add 'teacher' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- Create RLS policies for resource_files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resource_files', 'resource_files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resource file uploads
CREATE POLICY "Allow authenticated users to upload resource files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'resource_files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow public access to resource files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'resource_files');

CREATE POLICY "Allow authenticated users to update resource files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'resource_files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete resource files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'resource_files' AND auth.role() = 'authenticated');