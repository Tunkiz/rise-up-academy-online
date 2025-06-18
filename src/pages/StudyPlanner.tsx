import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BookOpen, Calendar, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthProvider';
import { useStudyPlanGeneration } from '@/hooks/useStudyPlanGeneration';
import GeneratedPlanView from '@/components/study-planner/GeneratedPlanView';
import PastPlansList from '@/components/study-planner/PastPlansList';

interface StudyPlanInput {
  subject: string;
  topic: string;
  duration: number;
  frequency: string;
  notes: string;
}

const StudyPlanner = () => {
  const { user } = useAuth();
  const [studyPlanInput, setStudyPlanInput] = useState<StudyPlanInput>({
    subject: '',
    topic: '',
    duration: 30,
    frequency: 'Daily',
    notes: '',
  });
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { mutate: generateStudyPlan } = useStudyPlanGeneration();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStudyPlanInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setStudyPlanInput(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to generate a study plan.');
      return;
    }

    setIsGenerating(true);
    generateStudyPlan(
      { ...studyPlanInput },
      {
        onSuccess: (data) => {
          setGeneratedPlan(data?.content || null);
          toast.success('Study plan generated successfully!');
        },
        onError: (error) => {
          console.error('Error generating study plan:', error);
          toast.error('Failed to generate study plan. Please try again.');
        },
        onSettled: () => {
          setIsGenerating(false);
        },
      }
    );
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
              <Label htmlFor="subject">Subject</Label>
              <Input
                type="text"
                id="subject"
                name="subject"
                value={studyPlanInput.subject}
                onChange={handleInputChange}
                placeholder="e.g., Mathematics"
                required
              />
            </div>
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                type="text"
                id="topic"
                name="topic"
                value={studyPlanInput.topic}
                onChange={handleInputChange}
                placeholder="e.g., Algebra"
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                type="number"
                id="duration"
                name="duration"
                value={studyPlanInput.duration}
                onChange={handleInputChange}
                placeholder="e.g., 30"
                required
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select onValueChange={(value) => handleSelectChange(value, 'frequency')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={studyPlanInput.notes}
                onChange={handleInputChange}
                placeholder="Any specific instructions or notes for the study plan?"
              />
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

      {generatedPlan && (
        <GeneratedPlanView planContent={generatedPlan} />
      )}

      <PastPlansList />
    </div>
  );
};

export default StudyPlanner;
