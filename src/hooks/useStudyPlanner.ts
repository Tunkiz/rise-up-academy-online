
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { formSchema, FormValues } from "@/components/study-planner/StudyPlanForm";

type StudyPlan = Tables<'study_plans'>;

export const useStudyPlanner = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [interactivePlan, setInteractivePlan] = useState<string | null>(null);
  const [currentPlanDetails, setCurrentPlanDetails] = useState<FormValues | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { goal: "", timeframe: "", hours_per_week: 10 },
  });

  const { data: pastPlans, isLoading: isLoadingPastPlans } = useQuery({
    queryKey: ['study_plans', user?.id],
    queryFn: async (): Promise<StudyPlan[]> => {
      if (!user) return [];
      const { data, error } = await supabase.from('study_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: progressData, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('student_progress')
        .select(`progress, subjects (name)`)
        .eq('user_id', user.id);
      
      if (error) throw new Error(error.message);
      return data?.filter(p => p.subjects) || [];
    },
    enabled: !!user,
  });

  const { totalTasks, completedTasks } = useMemo(() => {
    if (!interactivePlan) return { totalTasks: 0, completedTasks: 0 };
    
    const taskRegex = /-\s\[( |x|X)\]/g;
    const tasks = interactivePlan.match(taskRegex) || [];
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.includes('[x]') || task.includes('[X]')).length;

    return { totalTasks, completedTasks };
  }, [interactivePlan]);

  const { mutate: generatePlan, isPending: isGenerating } = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase.functions.invoke('study-plan-generator', { body: values });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data.plan as string;
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error Generating Plan",
        description: error.message || "An unexpected error occurred. Please ensure your AI provider API key is set correctly in your Supabase secrets.",
      });
    },
  });

  const { mutate: savePlan, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!interactivePlan || !user || !currentPlanDetails) throw new Error("No plan to save.");
      const { error } = await supabase.from('study_plans').insert({
        user_id: user.id,
        goal: currentPlanDetails.goal,
        timeframe: currentPlanDetails.timeframe,
        hours_per_week: currentPlanDetails.hours_per_week,
        plan_content: interactivePlan,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plan saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ['study_plans', user?.id] });
      setInteractivePlan(null);
      setCurrentPlanDetails(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error Saving Plan",
        description: error.message,
      });
    },
  });

  const { mutate: updatePlan, isPending: isUpdatingPlan } = useMutation({
    mutationFn: async ({ planId, content }: { planId: string, content: string }) => {
      if (!user) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from('study_plans')
        .update({ plan_content: content })
        .match({ id: planId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plan updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['study_plans', user?.id] });
      setSelectedPlan(null); // Close the dialog on success
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error Updating Plan",
        description: error.message,
      });
    },
  });
  
  const { mutate: deletePlan, isPending: isDeletingPlan } = useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error("User not authenticated.");
      const { error } = await supabase.from('study_plans').delete().match({ id: planId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plan deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ['study_plans', user?.id] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error Deleting Plan",
        description: error.message,
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    let promptContext = "Please format the study plan as a markdown checklist (e.g., `- [ ] Task one`).";

    if (progressData && progressData.length > 0) {
      const progressString = progressData
        .sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))
        .map(p => `- ${p.subjects?.name}: ${p.progress}%`)
        .join('\n');
      
      promptContext = `For context, here is my current progress in my subjects:\n${progressString}\n\nPlease create a study plan that helps me achieve my main goal, and pay special attention to my weaker subjects (those with lower progress percentages).\n\nIMPORTANT: The plan must be a markdown checklist (e.g., \`- [ ] Task one\`).`;
    }

    const finalGoal = `${values.goal}\n\n${promptContext}`;

    generatePlan({ ...values, goal: finalGoal }, {
      onSuccess: (data) => {
        setInteractivePlan(data);
        setCurrentPlanDetails(values);
        toast({ title: "Study plan generated successfully!" });
      },
    });
  };

  const handleCheckboxToggle = (lineIndex: number, newCheckedState: boolean) => {
    setInteractivePlan(currentPlan => {
        if (!currentPlan) return null;
        const lines = currentPlan.split('\n');
        let lineToUpdate = lines[lineIndex];
        if (typeof lineToUpdate === 'undefined') return currentPlan;
        
        if (newCheckedState) {
          lineToUpdate = lineToUpdate.replace(/\[ \]/, '[x]');
        } else {
          lineToUpdate = lineToUpdate.replace(/\[[xX]\]/, '[ ]');
        }
        lines[lineIndex] = lineToUpdate;

        return lines.join('\n');
    });
  };

  return {
    form,
    onSubmit,
    isGenerating,
    isLoadingProgress,
    pastPlans,
    isLoadingPastPlans,
    setSelectedPlan,
    deletePlan,
    isDeletingPlan,
    currentPlanDetails,
    interactivePlan,
    isSaving,
    savePlan,
    handleCheckboxToggle,
    totalTasks,
    completedTasks,
    selectedPlan,
    updatePlan,
    isUpdatingPlan,
  };
};
