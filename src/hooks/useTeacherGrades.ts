import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTeacherGrades(teacherId?: string) {
  return useQuery({
    queryKey: ['teacher-grades', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data, error } = await supabase
        .from('teacher_grades')
        .select('grade')
        .eq('teacher_id', teacherId);

      if (error) throw error;
      return data.map(item => item.grade);
    },
    enabled: !!teacherId,
  });
}

export function useSetTeacherGrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teacherId, grades }: { teacherId: string; grades: number[] }) => {
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
        .from('teacher_grades')
        .delete()
        .eq('teacher_id', teacherId);

      if (deleteError) throw deleteError;

      // Add new grades
      if (grades.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_grades')
          .insert(
            grades.map(grade => ({
              teacher_id: teacherId,
              grade,
              tenant_id: profile.tenant_id,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, { teacherId }) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-grades', teacherId] });
      toast.success('Teacher grades updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating teacher grades:', error);
      toast.error('Failed to update teacher grades');
    },
  });
}