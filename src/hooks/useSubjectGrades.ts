import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSubjectGrades(subjectId?: string) {
  return useQuery({
    queryKey: ['subject-grades', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from('subject_grades')
        .select('grade')
        .eq('subject_id', subjectId);

      if (error) throw error;
      return data.map(item => item.grade);
    },
    enabled: !!subjectId,
  });
}

export function useSetSubjectGrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subjectId, grades }: { subjectId: string; grades: number[] }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('User tenant not found');

      // Remove existing grades
      const { error: deleteError } = await supabase
        .from('subject_grades')
        .delete()
        .eq('subject_id', subjectId);

      if (deleteError) throw deleteError;

      // Add new grades
      if (grades.length > 0) {
        const { error: insertError } = await supabase
          .from('subject_grades')
          .insert(
            grades.map(grade => ({
              subject_id: subjectId,
              grade,
              tenant_id: profile.tenant_id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { subjectId }) => {
      queryClient.invalidateQueries({ queryKey: ['subject-grades', subjectId] });
      toast.success('Subject grades updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating subject grades:', error);
      toast.error('Failed to update subject grades');
    },
  });
}