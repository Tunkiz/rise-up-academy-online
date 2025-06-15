
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudyPlanForm } from "@/components/study-planner/StudyPlanForm";
import { PastPlansList } from "@/components/study-planner/PastPlansList";
import { GeneratedPlanView } from "@/components/study-planner/GeneratedPlanView";
import { ViewPlanDialog } from "@/components/study-planner/ViewPlanDialog";
import { usePastStudyPlans } from "@/hooks/usePastStudyPlans";
import { useStudyPlanGeneration } from "@/hooks/useStudyPlanGeneration";
import { useTour } from "@/hooks/useTour";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

const formSchema = z.object({
  goal: z.string().min(1, "Goal is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  hoursPerWeek: z.number().min(1, "Hours per week must be at least 1"),
  subjects: z.array(z.string()).min(1, "At least one subject is required"),
  currentLevel: z.string().min(1, "Current level is required"),
});

const StudyPlanner = () => {
  const { user } = useAuth();
  const { startTour, isTourCompleted, markTourAsCompleted } = useTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [currentPlanDetails, setCurrentPlanDetails] = useState<any>(null);
  const tourId = 'study-planner';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: "",
      timeframe: "",
      hoursPerWeek: 1,
      subjects: [],
      currentLevel: "",
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
  
  const { mutate: generatePlan, isPending: isGenerating } = useStudyPlanGeneration();

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    generatePlan(data, {
      onSuccess: (result) => {
        setCurrentPlanDetails({ ...data, plan: result.plan });
      },
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
  }

  return (
    <>
      <div className="container py-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-4xl font-bold">AI Study Planner</h1>
              <p className="text-muted-foreground mt-2">Let our AI build the perfect study plan for you.</p>
            </div>
            <Card id="create-plan-card">
              <CardHeader>
                <CardTitle>Create Your Plan</CardTitle>
                <CardDescription>Tell us your goals. We'll analyze your current progress to generate a truly personalized plan.</CardDescription>
              </CardHeader>
              <CardContent>
                <StudyPlanForm
                  form={form}
                  onSubmit={onSubmit}
                  isGenerating={isGenerating}
                  isLoadingProgress={false}
                />
              </CardContent>
            </Card>
            
            <PastPlansList
              plans={pastPlans || []}
              isLoading={isLoadingPastPlans}
              onSelectPlan={setSelectedPlan}
              onDeletePlan={(planId) => deletePlan(planId)}
              isDeletingPlan={isDeletingPlan}
            />

          </div>
          <div id="generated-plan-view" className="sticky top-24 self-start">
            <GeneratedPlanView
              currentPlanDetails={currentPlanDetails}
              interactivePlan={null}
              isGenerating={isGenerating}
              isSaving={false}
              onSavePlan={() => {}}
              onCheckboxToggle={() => {}}
              totalTasks={0}
              completedTasks={0}
            />
          </div>
        </div>
        <ViewPlanDialog
          plan={selectedPlan}
          isOpen={!!selectedPlan}
          onOpenChange={(isOpen) => !isOpen && setSelectedPlan(null)}
          onUpdatePlan={(planId, content) => updatePlan({ planId, content })}
          isUpdating={isUpdatingPlan}
        />
      </div>
      <AlertDialog open={showTourPrompt} onOpenChange={setShowTourPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Study Planner Tour</AlertDialogTitle>
            <AlertDialogDescription>
              This is the AI Study Planner. Would you like a quick tour?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipTour}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartTour}>Start Tour</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default StudyPlanner;
