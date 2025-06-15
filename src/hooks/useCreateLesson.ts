
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateLessonData {
  title: string;
  content: string;
  description?: string;
  lesson_type: 'video' | 'quiz' | 'reading';
  topic_id: string;
  order?: number;
  pass_mark?: number;
  time_limit?: number;
  attachment_url?: string;
  due_date?: string;
}

export function useCreateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLessonData) => {
      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      const { data: lesson, error } = await supabase
        .from('lessons')
        .insert({
          ...data,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) throw error;
      return lesson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      toast.success('Lesson created successfully');
    },
    onError: (error) => {
      console.error('Error creating lesson:', error);
      toast.error('Failed to create lesson');
    },
  });
}
