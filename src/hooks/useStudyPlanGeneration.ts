
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudyPlanRequest {
  goal: string;
  timeframe: string;
  hoursPerWeek: number;
  subjects: string[];
  currentLevel: string;
}

interface StudyPlanResponse {
  plan: string;
}

export function useStudyPlanGeneration() {
  return useMutation({
    mutationFn: async (request: StudyPlanRequest): Promise<StudyPlanResponse> => {
      console.log('Generating study plan with request:', request);
      
      const { data, error } = await supabase.functions.invoke('study-plan-generator', {
        body: request
      });

      if (error) {
        console.error('Error from study plan generator:', error);
        throw new Error(error.message || 'Failed to generate study plan');
      }

      if (!data || !data.plan) {
        throw new Error('Invalid response from study plan generator');
      }

      // Save the generated study plan to the database
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        // Get current user's tenant_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.user.id)
          .single();

        if (!profile?.tenant_id) {
          throw new Error('User tenant not found');
        }

        const { error: saveError } = await supabase.from('study_plans').insert({
          user_id: user.user.id,
          goal: request.goal,
          timeframe: request.timeframe,
          hours_per_week: request.hoursPerWeek,
          plan_content: data.plan,
          tenant_id: profile.tenant_id,
        });

        if (saveError) {
          console.error('Error saving study plan:', saveError);
          // Don't throw here, we still want to return the plan even if saving fails
          toast.error('Generated plan successfully but failed to save it');
        }
      }

      return data;
    },
    onError: (error) => {
      console.error('Study plan generation error:', error);
      toast.error(`Failed to generate study plan: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Study plan generated successfully!');
    }
  });
}
