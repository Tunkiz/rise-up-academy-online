import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudyPlanForm, formSchema, FormValues } from "@/components/study-planner/StudyPlanForm";
import { PastPlansList } from "@/components/study-planner/PastPlansList";
import { GeneratedPlanView } from "@/components/study-planner/GeneratedPlanView";
import { ViewPlanDialog } from "@/components/study-planner/ViewPlanDialog";
import { usePastStudyPlans } from "@/hooks/usePastStudyPlans";
import { useStudyPlanGeneration } from "@/hooks/useStudyPlanGeneration";
import { useTour } from "@/hooks/useTour";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthProvider";

const studyPlannerTourSteps = [
    { target: '#create-plan-card', title: 'Create Your Plan', content: 'Start by telling us your goals, timeframe, and how much you can study each week.', placement: 'right' as const },
    { target: '#generated-plan-view', title: 'Your AI-Generated Plan', content: 'Your personalized study plan will appear here. You can interact with it, check off tasks, and save it for later.', placement: 'left' as const },
    { target: '#past-plans-list', title: 'Manage Past Plans', content: 'All your saved study plans will be listed here for you to review or delete.', placement: 'right' as const },
];

const StudyPlanner = () => {
  const { user } = useAuth();
  const { startTour, isTourCompleted, markTourAsCompleted } = useTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [currentPlanDetails, setCurrentPlanDetails] = useState<any>(null);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const tourId = 'study-planner';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: "",
      timeframe: "",
      hours_per_week: 1,
    },
  });
  const { 
    pastPlans, 
    isLoadingPastPlans, 
    selectedPlan, 
    setSelectedPlan, 
    updatePlan, 
    isUpdatingPlan, 
    deletePlan, 
    isDeletingPlan 
  } = usePastStudyPlans();
  
  // Dialog state for viewing/editing plans
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const { 
    generatePlan, 
    savePlan,
    isGenerating, 
    isSaving 
  } = useStudyPlanGeneration();

  const onSubmit = (data: FormValues) => {
    const requestData = {
      goal: data.goal,
      timeframe: data.timeframe,
      hoursPerWeek: data.hours_per_week,
      subjects: [] as string[],
      currentLevel: "intermediate"
    };
    
    generatePlan.mutate(requestData, {
      onSuccess: (result) => {
        setGeneratedPlan(result.plan);
        setCurrentPlanDetails(data);
      },
    });
  };

  const handleSavePlan = () => {
    if (!generatedPlan || !currentPlanDetails) return;
    
    savePlan.mutate({
      plan: generatedPlan,
      goal: currentPlanDetails.goal,
      timeframe: currentPlanDetails.timeframe,
      hoursPerWeek: currentPlanDetails.hours_per_week,
    });
  };

  useEffect(() => {
    if (user) {
        const timer = setTimeout(() => {
            if (!isTourCompleted(tourId)) {
                setShowTourPrompt(true);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [isTourCompleted, user]);

  const handleStartTour = () => {
    setShowTourPrompt(false);
    startTour(studyPlannerTourSteps, tourId);
  };
  
  const handleSkipTour = () => {
    setShowTourPrompt(false);
    markTourAsCompleted(tourId);
  };

  return (
    <>
      <div className="container py-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-8">
            <Card id="create-plan-card">
              <CardHeader>
                <CardTitle>Create Study Plan</CardTitle>
                <CardDescription>
                  Our AI will help create a personalized study plan based on your goals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudyPlanForm form={form} onSubmit={onSubmit} isGenerating={isGenerating} />
              </CardContent>
            </Card>          <div id="past-plans-list">
            <PastPlansList
              plans={pastPlans || []}
              isLoading={isLoadingPastPlans}
              onPlanClick={(plan) => {
                setSelectedPlan(plan);
                setIsViewDialogOpen(true);
              }}
              onPlanDelete={deletePlan}
              isDeleting={isDeletingPlan}
            />
          </div>
          </div>

          <div id="generated-plan-view">
            <GeneratedPlanView
              currentPlanDetails={currentPlanDetails}
              interactivePlan={generatedPlan}
              isGenerating={isGenerating}
              isSaving={isSaving}
              onSavePlan={handleSavePlan}
            />
          </div>
        </div>
      </div>

      {showTourPrompt && (
        <AlertDialog open={showTourPrompt} onOpenChange={setShowTourPrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Welcome to Study Planner!</AlertDialogTitle>
              <AlertDialogDescription>
                Would you like a quick tour of the Study Planner interface? It will help you make the most of this feature.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleSkipTour}>Skip Tour</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartTour}>Take the Tour</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}      <ViewPlanDialog
        plan={selectedPlan}
        isOpen={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) {
            setSelectedPlan(null);
          }
        }}
        onUpdatePlan={({planId, content}) => updatePlan({ planId, content })}
        isUpdating={isUpdatingPlan}
      />
    </>
  );
};

export default StudyPlanner;
