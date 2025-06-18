
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from 'sonner';

type QuizQuestionWithOptions = Tables<'quiz_questions'> & {
  quiz_options: Tables<'quiz_options'>[];
};

interface QuizProps {
  lessonId: string;
  passMark: number | null;
}

const Quiz = ({ lessonId, passMark }: QuizProps) => {
  const { data: questions, isLoading } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: async (): Promise<QuizQuestionWithOptions[]> => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_options (
            *
          )
        `)
        .eq('lesson_id', lessonId)
        .order('order', { ascending: true });

      if (error) {
        console.error("Error fetching quiz questions:", error);
        throw error;
      };
      return (data as QuizQuestionWithOptions[]) || [];
    },
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isResultSaved, setIsResultSaved] = useState(false);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saveQuizAttemptMutation = useMutation({
    mutationFn: async ({ score, passed }: { score: number; passed: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      // 1. Save quiz attempt
      const { error: attemptError } = await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        lesson_id: lessonId,
        score,
        passed,
        tenant_id: profile.tenant_id,
      });
      if (attemptError) throw attemptError;

      // 2. If passed, mark lesson as complete
      if (passed) {
        const { error: completionError } = await supabase
          .from("lesson_completions")
          .upsert({ 
            user_id: user.id, 
            lesson_id: lessonId,
            tenant_id: profile.tenant_id,
          });
        if (completionError) throw completionError;
      }
    },
    onSuccess: (_, { passed }) => {
      queryClient.invalidateQueries({ queryKey: ['quiz_attempts', user?.id, lessonId] });
      queryClient.invalidateQueries({ queryKey: ['lesson-completions'] });
      queryClient.invalidateQueries({ queryKey: ['learning_stats'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['recent_activity'] });
      if (passed) {
        toast.success("Quiz Passed! Lesson marked as complete.");
        queryClient.invalidateQueries({ queryKey: ["topics"] });
      } else {
        toast.error("You didn't pass this time. Feel free to retake the quiz.");
      }
    },
    onError: (error) => {
      console.error('Error saving quiz result:', error);
      toast.error(`Failed to save quiz result: ${error.message}`);
    },
  });

  useEffect(() => {
    if (currentQuestionIndex >= (questions?.length ?? 0) && !isResultSaved && questions && questions.length > 0 && user) {
      const score = Math.round((correctAnswers / questions.length) * 100);
      const passed = score >= (passMark ?? 70); // Default to 70 if not set
      saveQuizAttemptMutation.mutate({ score, passed });
      setIsResultSaved(true);
    }
  }, [currentQuestionIndex, questions, isResultSaved, correctAnswers, passMark, user, saveQuizAttemptMutation]);

  
  if (isLoading) {
    return (
      <div className="not-prose space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return <p className="text-muted-foreground">No quiz questions available for this lesson yet.</p>;
  }

  const handleNext = () => {
    setIsSubmitted(false);
    setSelectedOptionId(null);
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };
  
  const handleRetake = () => {
    setCurrentQuestionIndex(0);
    setCorrectAnswers(0);
    setSelectedOptionId(null);
    setIsSubmitted(false);
    setIsResultSaved(false);
  }

  if (currentQuestionIndex >= questions.length) {
    return (
      <div className="not-prose">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2">You answered {correctAnswers} out of {questions.length} questions correctly.</p>
            <p className="text-2xl font-bold">Score: {Math.round((correctAnswers / (questions.length || 1)) * 100)}%</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleRetake}>
              Retake Quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  const selectedOption = currentQuestion?.quiz_options.find(o => o.id === selectedOptionId);
  
  const handleSubmit = () => {
    if (!selectedOption) return;
    setIsSubmitted(true);
    if (selectedOption.is_correct) {
      setCorrectAnswers(correctAnswers + 1);
    }
  };
  
  return (
    <div className="not-prose">
      <Card>
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
          <CardDescription className="text-lg pt-2">{currentQuestion.question_text}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedOptionId || ''}
            onValueChange={setSelectedOptionId}
            disabled={isSubmitted}
            className="space-y-2"
          >
            {currentQuestion.quiz_options.sort((a,b) => a.option_text.localeCompare(b.option_text)).map((option) => (
              <div
                key={option.id}
                className={`flex items-center space-x-3 p-3 rounded-md border ${
                  isSubmitted && option.is_correct ? 'border-green-500 bg-green-50' : ''
                } ${
                  isSubmitted && !option.is_correct && selectedOptionId === option.id ? 'border-red-500 bg-red-50' : ''
                }`}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">{option.option_text}</Label>
                {isSubmitted && option.is_correct && <CheckCircle className="h-5 w-5 text-green-600" />}
                {isSubmitted && !option.is_correct && selectedOptionId === option.id && <XCircle className="h-5 w-5 text-red-600" />}
              </div>
            ))}
          </RadioGroup>
          {isSubmitted && selectedOption && (
            <div className={`mt-4 text-base font-semibold flex items-center ${selectedOption.is_correct ? 'text-green-600' : 'text-red-600'}`}>
              {selectedOption.is_correct ? 'Correct!' : 'Incorrect.'}
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!isSubmitted ? (
            <Button onClick={handleSubmit} disabled={!selectedOptionId}>
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleNext} className="ml-auto">
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Quiz;
