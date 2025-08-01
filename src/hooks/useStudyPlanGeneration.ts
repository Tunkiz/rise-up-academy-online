import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudyPlanRequest {
  goal: string;
  timeframe: string;
  hoursPerWeek: number; // Changed to match the request format
  subjects: string[];
  currentLevel: "beginner" | "intermediate" | "advanced"; // Changed to match the request format
  targetDate?: Date; // Changed to match the request format
}

interface StudyPlanResponse {
  plan: string;
}

export function useStudyPlanGeneration() {
  const savePlan = useMutation({
    mutationFn: async (planDetails: { 
      plan: string;
      goal: string;
      timeframe: string;
      hoursPerWeek: number;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

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
        goal: planDetails.goal,
        timeframe: planDetails.timeframe,
        hours_per_week: planDetails.hoursPerWeek,
        plan_content: planDetails.plan,
        tenant_id: profile.tenant_id,
      });

      if (saveError) {
        throw saveError;
      }

      return { success: true };
    },
    onError: (error) => {
      console.error('Error saving study plan:', error);
      toast.error(`Failed to save study plan: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Study plan saved successfully!');
    }
  });

  const generatePlan = useMutation({
    mutationFn: async (request: StudyPlanRequest): Promise<StudyPlanResponse> => {
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

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('study-plan-generator', {
        body: {
          ...request,
          userId: user.user.id,
          tenantId: profile.tenant_id
        }
      });

      if (error) {
        console.error('Error generating plan:', error);
        throw new Error(error.message);
      }

      return { plan: data.plan };
    },
    onError: (error) => {
      toast.error('Failed to generate plan: ' + error.message);
    }
  });

  return {
    generatePlan,
    savePlan,
    isGenerating: generatePlan.isPending,
    isSaving: savePlan.isPending,
  };
}
