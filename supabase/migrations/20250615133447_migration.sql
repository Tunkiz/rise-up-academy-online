
-- Create the storage bucket for resource files like lesson documents and attachments.
-- This bucket is public, has a 50MB file size limit, and allows common document and image types.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resource_files', 'resource_files', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow public read access to the resource files.
CREATE POLICY "Public can view resource files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'resource_files' );

-- RLS: Allow admins to manage all resource files (upload, update, delete).
CREATE POLICY "Admins can manage all resource files"
ON storage.objects FOR ALL
USING ( bucket_id = 'resource_files' AND public.is_admin() )
WITH CHECK ( bucket_id = 'resource_files' AND public.is_admin() );
