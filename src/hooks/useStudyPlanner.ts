
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StudyPlan {
  id: string;
  goal: string;
  timeframe: string;
  hours_per_week: number;
  plan_content: string;
  created_at: string;
  updated_at: string | null;
}

export function useStudyPlans() {
  return useQuery({
    queryKey: ['study-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudyPlan[];
    },
  });
}

export function useCreateStudyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planData: {
      goal: string;
      timeframe: string;
      hours_per_week: number;
      plan_content: string;
    }) => {
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
        .from('study_plans')
        .insert({
          ...planData,
          user_id: user.user.id,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      toast.success('Study plan created successfully!');
    },
    onError: (error) => {
      console.error('Error creating study plan:', error);
      toast.error('Failed to create study plan');
    },
  });
}
