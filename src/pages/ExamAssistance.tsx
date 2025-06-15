
import { AITutorChat } from "@/components/exam-assistance/AITutorChat";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTour } from "@/hooks/useTour";
import { useEffect, useState } from "react";
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

const examAssistanceTourSteps = [
    { target: '#exam-assistance-title', title: 'AI-Powered Exam Assistance', content: 'Use our AI Tutor to get explanations, solve problems, and prepare for your exams.', placement: 'bottom' as const },
    { target: '#ai-tutor-chat-card', title: 'AI Tutor Chat', content: 'Start typing your question here to get instant help from our AI Tutor.', placement: 'top' as const },
];

const ExamAssistance = () => {
  const { user } = useAuth();
  const { startTour, isTourCompleted, markTourAsCompleted } = useTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const tourId = 'exam-assistance';

  useEffect(() => {
    if (user) {
        const timer = setTimeout(() => {
            if (!isTourCompleted(tourId)) {
                setShowTourPrompt(true);
            }
        }, 1500);
        return () => {
          clearTimeout(timer);
        };
    }
  }, [isTourCompleted, user]);

  const handleStartTour = () => {
    setShowTourPrompt(false);
    startTour(examAssistanceTourSteps, tourId);
  };
  
  const handleSkipTour = () => {
      setShowTourPrompt(false);
      markTourAsCompleted(tourId);
  }

  return (
    <>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-4">
            <h1 id="exam-assistance-title" className="text-4xl font-bold">Exam Assistance</h1>
            <p className="mt-2 text-muted-foreground">
              Use our AI-powered tools to get help with your exam preparations.
            </p>
          </div>
          <Button asChild>
            <Link to="/tutor-notes">View Saved Notes</Link>
          </Button>
        </div>
        <AITutorChat />
      </div>
      <AlertDialog open={showTourPrompt} onOpenChange={setShowTourPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exam Assistance Tour</AlertDialogTitle>
            <AlertDialogDescription>
              Welcome! Would you like a quick tour of this page?
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

export default ExamAssistance;
