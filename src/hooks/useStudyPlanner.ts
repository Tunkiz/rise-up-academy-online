
import { useStudyPlanGeneration } from './useStudyPlanGeneration';
import { usePastStudyPlans } from './usePastStudyPlans';

export const useStudyPlanner = () => {
  const generation = useStudyPlanGeneration();
  const pastPlansData = usePastStudyPlans();

  return {
    // from useStudyPlanGeneration
    form: generation.form,
    onSubmit: generation.onSubmit,
    isGenerating: generation.isGenerating,
    isLoadingProgress: generation.isLoadingProgress,
    currentPlanDetails: generation.currentPlanDetails,
    interactivePlan: generation.interactivePlan,
    isSaving: generation.isSaving,
    savePlan: generation.savePlan,
    handleCheckboxToggle: generation.handleCheckboxToggle,
    totalTasks: generation.totalTasks,
    completedTasks: generation.completedTasks,

    // from usePastStudyPlans
    pastPlans: pastPlansData.pastPlans,
    isLoadingPastPlans: pastPlansData.isLoadingPastPlans,
    selectedPlan: pastPlansData.selectedPlan,
    setSelectedPlan: pastPlansData.setSelectedPlan,
    updatePlan: pastPlansData.updatePlan,
    isUpdatingPlan: pastPlansData.isUpdatingPlan,
    deletePlan: pastPlansData.deletePlan,
    isDeletingPlan: pastPlansData.isDeletingPlan,
  };
};
