
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateResourceData {
  title: string;
  description?: string;
  file_url?: string;
  subject_id?: string;
  grade?: number;
  uploadType?: 'url' | 'file';
  selectedFile?: File | null;
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateResourceData) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
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
        .insert({
          title: data.title,
          description: data.description,
          file_url: finalFileUrl,
          subject_id: data.subject_id,
          grade: data.grade,
          tenant_id: profile.tenant_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource created successfully');
    },
    onError: (error) => {
      console.error('Error creating resource:', error);
      toast.error('Failed to create resource');
    },
  });
}
