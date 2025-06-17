import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudyPlanForm } from "@/components/study-planner/StudyPlanForm";
import { PastPlansList } from "@/components/study-planner/PastPlansList";
import { formSchema, type FormValues } from "@/components/study-planner/form-schema";
import type { StudyPlan, StudyPlanTemplate as PlanTemplate } from "@/components/study-planner/schema";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const studyPlannerTourSteps = [
    { target: '#create-plan-card', title: 'Create Your Plan', content: 'Start by telling us your goals, timeframe, and how much you can study each week.', placement: 'right' as const },
    { target: '#generated-plan-view', title: 'Your AI-Generated Plan', content: 'Your personalized study plan will appear here. You can interact with it, check off tasks, and save it for later.', placement: 'left' as const },
    { target: '#past-plans-list', title: 'Manage Past Plans', content: 'All your saved study plans will be listed here for you to review or delete.', placement: 'right' as const },
    { target: '#plan-templates', title: 'Plan Templates', content: 'Choose from our pre-made templates or create your own custom plan.', placement: 'right' as const },
];

// Type for the database study plan
interface DBStudyPlan extends Omit<StudyPlan, 'subjects'> {
  subjects?: string[];
}

// Type for the current plan details
interface CurrentPlanDetails extends FormValues {
  plan_content?: string;
}

const planTemplates: PlanTemplate[] = [
  {
    title: "Exam Preparation",
    goal: "Prepare for upcoming exams with comprehensive revision",
    timeframe: "2 months",
    hours_per_week: 15,
    subjects: ["mathematics", "physics", "chemistry"],
    difficulty_level: "intermediate",
  },
  {
    title: "Language Learning",
    goal: "Achieve conversational fluency in a new language",
    timeframe: "6 months",
    hours_per_week: 10,
    subjects: ["english"],
    difficulty_level: "beginner",
  },
  {
    title: "Career Development",
    goal: "Master key skills for career advancement",
    timeframe: "3 months",
    hours_per_week: 8,
    subjects: ["computer_science", "business_studies"],
    difficulty_level: "advanced",
  },
];

const StudyPlanner = () => {
  const { user } = useAuth();
  const { startTour, isTourCompleted, markTourAsCompleted } = useTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [currentPlanDetails, setCurrentPlanDetails] = useState<Partial<FormValues> | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const tourId = 'study-planner';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goal: "",
      timeframe: "",
      hours_per_week: 1,
      subjects: [],
      difficulty_level: "intermediate",
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

  const filteredPlans = (pastPlans as DBStudyPlan[] | undefined)?.filter(plan => {    const matchesSearch = searchTerm === "" || 
      plan.goal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.plan_content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = !selectedSubject || 
      plan.subjects?.includes(selectedSubject);
    
    return matchesSearch && matchesSubject;
  });

  const handleTemplateSelect = (template: PlanTemplate) => {
    form.reset({
      goal: template.goal,
      timeframe: template.timeframe,
      hours_per_week: template.hours_per_week,
      subjects: template.subjects,
      difficulty_level: template.difficulty_level,
    });
  };

  const onSubmit = (data: FormValues) => {
    const requestData = {
      goal: data.goal,
      timeframe: data.timeframe,
      hoursPerWeek: data.hours_per_week,
      subjects: data.subjects,
      currentLevel: data.difficulty_level,
      targetDate: data.target_date,
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
    
    const planData = {
      plan: generatedPlan,
      goal: currentPlanDetails.goal,
      timeframe: currentPlanDetails.timeframe,
      hoursPerWeek: currentPlanDetails.hours_per_week,
      subjects: currentPlanDetails.subjects ?? [],
      difficulty_level: currentPlanDetails.difficulty_level,
      target_date: currentPlanDetails.target_date,
    };
    
    savePlan.mutate(planData);
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
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Plan</TabsTrigger>
                <TabsTrigger value="templates" id="plan-templates">Templates</TabsTrigger>
              </TabsList>
              <TabsContent value="create">
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
                </Card>
              </TabsContent>
              <TabsContent value="templates">
                <Card>
                  <CardHeader>
                    <CardTitle>Plan Templates</CardTitle>
                    <CardDescription>
                      Choose a template to quickly create a study plan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {planTemplates.map((template) => (
                      <Card key={template.title}className="cursor-pointer hover:bg-accent" onClick={() => handleTemplateSelect(template)}>
                        <CardHeader>
                          <CardTitle className="text-lg">{template.title}</CardTitle>
                          <CardDescription>{template.goal}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {template.timeframe} • {template.hours_per_week} hours/week • {template.difficulty_level}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="search">Search Plans</Label>
                  <Input
                    id="search"
                    placeholder="Search by goal or content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subject-filter">Filter by Subject</Label>                  <select
                    id="subject-filter"
                    className="w-full px-3 py-2 bg-background border rounded-md"
                    value={selectedSubject || ""}
                    onChange={(e) => setSelectedSubject(e.target.value || null)}
                    aria-label="Filter study plans by subject"
                  >
                    <option value="">All Subjects</option>
                    {form.getValues("subjects")?.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div id="past-plans-list">
                <PastPlansList
                  plans={filteredPlans || []}
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
          </div>

          <div id="generated-plan-view">
            <GeneratedPlanView
              currentPlanDetails={currentPlanDetails}
              interactivePlan={generatedPlan}
              isGenerating={isGenerating}
              isSaving={isSaving}
              onSavePlan={handleSavePlan}
              onCheckboxToggle={(lineIndex, checked) => {
                const lines = generatedPlan?.split('\n') || [];
                const updatedLines = [...lines];
                const lineToUpdate = updatedLines[lineIndex];
                if (!lineToUpdate) return;

                if (checked) {
                  updatedLines[lineIndex] = lineToUpdate.replace(/\[ \]/, '[x]');
                } else {
                  updatedLines[lineIndex] = lineToUpdate.replace(/\[[xX]\]/, '[ ]');
                }

                setGeneratedPlan(updatedLines.join('\n'));
              }}
              totalTasks={
                (generatedPlan?.match(/-\s\[[xX ]\]/g) || []).length
              }
              completedTasks={
                (generatedPlan?.match(/-\s\[[xX]\]/g) || []).length
              }
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
      )}

      {selectedPlan && (
        <ViewPlanDialog
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
      )}
    </>
  );
};

export default StudyPlanner;
