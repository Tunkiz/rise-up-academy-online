
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubmitQuizData {
  lessonId: string;
  score: number;
  passed: boolean;
}

export function useQuizSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lessonId, score, passed }: SubmitQuizData) => {
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
        .from('quiz_attempts')
        .insert({
          user_id: user.user.id,
          lesson_id: lessonId,
          score,
          passed,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
      if (data.passed) {
        toast.success(`Quiz passed with ${data.score}%!`);
      } else {
        toast.error(`Quiz failed with ${data.score}%. Try again!`);
      }
    },
    onError: (error) => {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    },
  });
}
