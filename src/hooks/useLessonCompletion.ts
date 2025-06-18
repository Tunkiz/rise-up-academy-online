
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLessonCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
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

      // Check if lesson is already completed
      const { data: existingCompletion } = await supabase
        .from('lesson_completions')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (existingCompletion) {
        throw new Error('Lesson already completed');
      }

      const { data, error } = await supabase
        .from('lesson_completions')
        .insert({
          user_id: user.user.id,
          lesson_id: lessonId,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-completions'] });
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
      queryClient.invalidateQueries({ queryKey: ['learning_stats'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['recent_activity'] });
      toast.success('Lesson completed!');
    },
    onError: (error) => {
      console.error('Error completing lesson:', error);
      if (error.message === 'Lesson already completed') {
        toast.info('Lesson already completed');
      } else {
        toast.error('Failed to complete lesson');
      }
    },
  });
}
