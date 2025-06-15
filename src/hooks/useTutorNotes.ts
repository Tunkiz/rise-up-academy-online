
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TutorNote {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
}

export function useTutorNotes() {
  return useQuery({
    queryKey: ['tutor-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TutorNote[];
    },
  });
}

export function useSaveTutorNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prompt, response }: { prompt: string; response: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      const { data, error } = await supabase
        .from('tutor_notes')
        .insert({
          user_id: user.user.id,
          prompt,
          response,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-notes'] });
      toast.success('Note saved successfully!');
    },
    onError: (error) => {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    },
  });
}

export function useDeleteTutorNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('tutor_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-notes'] });
      toast.success('Note deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
  });
}
