
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudyPlanForm } from "@/components/study-planner/StudyPlanForm";
import { PastPlansList } from "@/components/study-planner/PastPlansList";
import { GeneratedPlanView } from "@/components/study-planner/GeneratedPlanView";
import { ViewPlanDialog } from "@/components/study-planner/ViewPlanDialog";
import { useStudyPlanner } from "@/hooks/useStudyPlanner";

const StudyPlanner = () => {
  const {
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
  } = useStudyPlanner();

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
            totalTasks={totalTasks}
            completedTasks={completedTasks}
          />
        </div>
      </div>
      <ViewPlanDialog
        plan={selectedPlan}
        isOpen={!!selectedPlan}
        onOpenChange={(isOpen) => !isOpen && setSelectedPlan(null)}
        onUpdatePlan={updatePlan}
        isUpdating={isUpdatingPlan}
      />
    </div>
  );
};

export default StudyPlanner;
