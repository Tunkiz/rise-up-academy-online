import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateResourceData {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  subject_id?: string;
  grade?: number;
  uploadType?: 'url' | 'file';
  selectedFile?: File | null;
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateResourceData) => {
      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      let finalFileUrl = data.file_url || '';

      // Handle file upload if file is selected
      if (data.uploadType === 'file' && data.selectedFile) {
        const fileExt = data.selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `resources/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resource_files')
          .upload(filePath, data.selectedFile);

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('resource_files')
          .getPublicUrl(filePath);

        finalFileUrl = publicUrl;
      }

      const { data: resource, error } = await supabase
        .from('resources')
        .update({
          title: data.title,
          description: data.description,
          file_url: finalFileUrl,
          subject_id: data.subject_id,
          grade: data.grade,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource updated successfully');
    },
    onError: (error) => {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    },
  });
}