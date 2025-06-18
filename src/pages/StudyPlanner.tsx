import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthProvider';
import { useStudyPlanGeneration } from '@/hooks/useStudyPlanGeneration';
import { GeneratedPlanView } from '@/components/study-planner/GeneratedPlanView';
import { PastPlansList } from '@/components/study-planner/PastPlansList';
import { usePastStudyPlans } from '@/hooks/usePastStudyPlans';
import { ViewPlanDialog } from '@/components/study-planner/ViewPlanDialog';

interface StudyPlanInput {
  goal: string;
  timeframe: string;
  hoursPerWeek: number;
  subjects: string[];
  currentLevel: "beginner" | "intermediate" | "advanced";
  targetDate?: Date;
}

const StudyPlanner = () => {
  const { user } = useAuth();
  const [studyPlanInput, setStudyPlanInput] = useState<StudyPlanInput>({
    goal: '',
    timeframe: '4 weeks',
    hoursPerWeek: 10,
    subjects: [],
    currentLevel: 'beginner',
    targetDate: undefined,
  });
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [currentPlanDetails, setCurrentPlanDetails] = useState<any>(null);
  const [interactivePlan, setInteractivePlan] = useState<string | null>(null);

  const { generatePlan, savePlan, isGenerating, isSaving } = useStudyPlanGeneration();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'hoursPerWeek') {
      setStudyPlanInput(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setStudyPlanInput(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (value: string, name: string) => {
    setStudyPlanInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSubjectsChange = (value: string) => {
    const subjects = value.split(',').map(s => s.trim()).filter(s => s);
    setStudyPlanInput(prev => ({ ...prev, subjects }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to generate a study plan.');
      return;
    }

    generatePlan.mutate(studyPlanInput, {
      onSuccess: (data) => {
        setGeneratedPlan(data.plan);
        setInteractivePlan(data.plan);
        setCurrentPlanDetails({
          goal: studyPlanInput.goal,
          timeframe: studyPlanInput.timeframe,
          hours_per_week: studyPlanInput.hoursPerWeek,
          subjects: studyPlanInput.subjects,
          difficulty_level: studyPlanInput.currentLevel,
          target_date: studyPlanInput.targetDate,
        });
        toast.success('Study plan generated successfully!');
      },
      onError: (error) => {
        console.error('Error generating study plan:', error);
        toast.error('Failed to generate study plan. Please try again.');
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

  const handleCheckboxToggle = (lineIndex: number, currentChecked: boolean) => {
    setInteractivePlan(currentContent => {
      if (!currentContent) return null;
      const lines = currentContent.split('\n');
      const lineToUpdate = lines[lineIndex];
      if (typeof lineToUpdate === 'undefined') return currentContent;

      let updatedLine;
      if (currentChecked) {
        updatedLine = lineToUpdate.replace(/\[ \]/, '[x]');
      } else {
        updatedLine = lineToUpdate.replace(/\[[xX]\]/, '[ ]');
      }
      lines[lineIndex] = updatedLine;
      
      return lines.join('\n');
    });
  };

  const calculateTaskProgress = () => {
    if (!interactivePlan) return { totalTasks: 0, completedTasks: 0 };
    
    const taskRegex = /-\s\[( |x|X)\]/g;
    const tasks = interactivePlan.match(taskRegex) || [];
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.includes('[x]') || task.includes('[X]')).length;

    return { totalTasks, completedTasks };
  };

  const { totalTasks, completedTasks } = calculateTaskProgress();

  const handlePlanClick = (plan: any) => {
    setSelectedPlan(plan);
  };

  const handlePlanDelete = (planId: string) => {
    deletePlan(planId);
  };

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Study Plan</CardTitle>
          <CardDescription>Customize your study plan to fit your needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <Label htmlFor="goal">Study Goal</Label>
              <Input
                type="text"
                id="goal"
                name="goal"
                value={studyPlanInput.goal}
                onChange={handleInputChange}
                placeholder="e.g., Learn React fundamentals"
                required
              />
            </div>
            <div>
              <Label htmlFor="subjects">Subjects (comma-separated)</Label>
              <Input
                type="text"
                id="subjects"
                name="subjects"
                value={studyPlanInput.subjects.join(', ')}
                onChange={(e) => handleSubjectsChange(e.target.value)}
                placeholder="e.g., JavaScript, React, CSS"
                required
              />
            </div>
            <div>
              <Label htmlFor="hoursPerWeek">Hours per Week</Label>
              <Input
                type="number"
                id="hoursPerWeek"
                name="hoursPerWeek"
                value={studyPlanInput.hoursPerWeek}
                onChange={handleInputChange}
                placeholder="e.g., 10"
                required
              />
            </div>
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select onValueChange={(value) => handleSelectChange(value, 'timeframe')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2 weeks">2 weeks</SelectItem>
                  <SelectItem value="4 weeks">4 weeks</SelectItem>
                  <SelectItem value="8 weeks">8 weeks</SelectItem>
                  <SelectItem value="3 months">3 months</SelectItem>
                  <SelectItem value="6 months">6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currentLevel">Current Level</Label>
              <Select onValueChange={(value) => handleSelectChange(value as "beginner" | "intermediate" | "advanced", 'currentLevel')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your current level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  Generating...
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Generate Study Plan
                  <BookOpen className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {interactivePlan && (
        <GeneratedPlanView
          currentPlanDetails={currentPlanDetails}
          interactivePlan={interactivePlan}
          isGenerating={isGenerating}
          isSaving={isSaving}
          onSavePlan={handleSavePlan}
          onCheckboxToggle={handleCheckboxToggle}
          totalTasks={totalTasks}
          completedTasks={completedTasks}
        />
      )}

      <PastPlansList
        plans={pastPlans || []}
        isLoading={isLoadingPastPlans}
        onPlanClick={handlePlanClick}
        onPlanDelete={handlePlanDelete}
        isDeleting={isDeletingPlan}
      />

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
