
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUserSubjects() {
  return useQuery({
    queryKey: ['user-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subjects')
        .select(`
          id,
          subject_id,
          subjects (
            id,
            name,
            teams_link,
            class_time
          )
        `);

      if (error) throw error;
      return data;
    },
  });
}

export function useEnrollInSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subjectId: string) => {
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
        .from('user_subjects')
        .insert({
          user_id: user.user.id,
          subject_id: subjectId,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subjects'] });
      toast.success('Successfully enrolled in subject!');
    },
    onError: (error) => {
      console.error('Error enrolling in subject:', error);
      toast.error('Failed to enroll in subject');
    },
  });
}
