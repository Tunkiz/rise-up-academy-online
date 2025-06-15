
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";

import { StudyPlanForm, formSchema, FormValues } from "@/components/study-planner/StudyPlanForm";
import { PastPlansList } from "@/components/study-planner/PastPlansList";
import { GeneratedPlanView } from "@/components/study-planner/GeneratedPlanView";
import { ViewPlanDialog } from "@/components/study-planner/ViewPlanDialog";

type StudyPlan = Tables<'study_plans'>;

const StudyPlanner = () => {
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

  const { mutate: generatePlan, isPending: isGenerating } = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase.functions.invoke('study-plan-generator', { body: values });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data.plan as string;
    },
    onSuccess: (data) => {
      setInteractivePlan(data);
      toast({ title: "Study plan generated successfully!" });
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
    setCurrentPlanDetails(values);
    let finalGoal = values.goal;

    if (progressData && progressData.length > 0) {
      const progressString = progressData
        .sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))
        .map(p => `- ${p.subjects?.name}: ${p.progress}%`)
        .join('\n');
      
      finalGoal = `${values.goal}\n\nFor context, here is my current progress in my subjects:\n${progressString}\n\nPlease create a study plan that helps me achieve my main goal, and pay special attention to my weaker subjects (those with lower progress percentages).`;
    }

    generatePlan({ ...values, goal: finalGoal });
  };

  const handleCheckboxToggle = (lineIndex: number, currentChecked: boolean) => {
    setInteractivePlan(currentPlan => {
        if (!currentPlan) return null;
        const lines = currentPlan.split('\n');
        const lineToUpdate = lines[lineIndex];
        if (!lineToUpdate) return currentPlan;
        
        const newText = currentChecked ? '- [ ]' : '- [x]';
        const oldText = currentChecked ? '- [x]' : '- [ ]';
        
        if (lineToUpdate.includes(oldText)) {
          lines[lineIndex] = lineToUpdate.replace(oldText, newText);
        }
        return lines.join('\n');
    });
  };
  
  return (
    <div className="container py-10">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-bold">AI Study Planner</h1>
            <p className="text-muted-foreground mt-2">Let our AI build the perfect study plan for you.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Create Your Plan</CardTitle>
              <CardDescription>Tell us your goals. We'll analyze your current progress to generate a truly personalized plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <StudyPlanForm
                form={form}
                onSubmit={onSubmit}
                isGenerating={isGenerating}
                isLoadingProgress={isLoadingProgress}
              />
            </CardContent>
          </Card>
          
          <PastPlansList
            plans={pastPlans || []}
            isLoading={isLoadingPastPlans}
            onSelectPlan={setSelectedPlan}
            onDeletePlan={deletePlan}
            isDeletingPlan={isDeletingPlan}
          />

        </div>
        <div className="sticky top-24 self-start">
          <GeneratedPlanView
            currentPlanDetails={currentPlanDetails}
            interactivePlan={interactivePlan}
            isGenerating={isGenerating}
            isSaving={isSaving}
            onSavePlan={() => savePlan()}
            onCheckboxToggle={handleCheckboxToggle}
          />
        </div>
      </div>
      <ViewPlanDialog
        plan={selectedPlan}
        isOpen={!!selectedPlan}
        onOpenChange={(isOpen) => !isOpen && setSelectedPlan(null)}
      />
    </div>
  );
};

export default StudyPlanner;
