import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  BookOpen, 
  Calendar,
  AlertTriangle,
  TrendingUp,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StudentAcademicDetailsProps {
  userId: string;
}

interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  created_at: string;
  lesson_title: string;
  subject_name: string;
}

interface LessonCompletion {
  id: string;
  completed_at: string;
  lesson_title: string;
  subject_name: string;
}

const StudentAcademicDetails = ({ userId }: StudentAcademicDetailsProps) => {
  // Fetch quiz attempts with lesson and subject details
  const { data: quizAttempts, isLoading: quizLoading, error: quizError } = useQuery({
    queryKey: ['student-quiz-attempts', userId],
    queryFn: async (): Promise<QuizAttempt[]> => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          passed,
          created_at,
          lessons!inner(
            title,
            topics!inner(
              name,
              subjects!inner(
                name
              )
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(attempt => ({
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        created_at: attempt.created_at,
        lesson_title: attempt.lessons?.title || 'Unknown Lesson',
        subject_name: attempt.lessons?.topics?.subjects?.name || 'Unknown Subject'
      }));
    },
    enabled: !!userId,
  });

  // Fetch lesson completions with lesson and subject details
  const { data: lessonCompletions, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ['student-lesson-completions', userId],
    queryFn: async (): Promise<LessonCompletion[]> => {
      const { data, error } = await supabase
        .from('lesson_completions')
        .select(`
          id,
          completed_at,
          lessons!inner(
            title,
            topics!inner(
              name,
              subjects!inner(
                name
              )
            )
          )
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(completion => ({
        id: completion.id,
        completed_at: completion.completed_at,
        lesson_title: completion.lessons?.title || 'Unknown Lesson',
        subject_name: completion.lessons?.topics?.subjects?.name || 'Unknown Subject'
      }));
    },
    enabled: !!userId,
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const calculateAverageScore = () => {
    if (!quizAttempts || quizAttempts.length === 0) return 0;
    const total = quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return total / quizAttempts.length;
  };

  const getPassRate = () => {
    if (!quizAttempts || quizAttempts.length === 0) return 0;
    const passed = quizAttempts.filter(attempt => attempt.passed).length;
    return (passed / quizAttempts.length) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Academic Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quizzes">Quiz Results</TabsTrigger>
            <TabsTrigger value="lessons">Lesson Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Target className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{calculateAverageScore().toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                  <p className="text-2xl font-bold">{getPassRate().toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <BookOpen className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                  <p className="text-2xl font-bold">{lessonCompletions?.length || 0}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="space-y-4">
            {quizLoading && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            )}
            
            {quizError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load quiz results: {quizError.message}</AlertDescription>
              </Alert>
            )}
            
            {!quizLoading && !quizError && quizAttempts && quizAttempts.length > 0 && (
              <div className="space-y-4">
                {quizAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {attempt.passed ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{attempt.lesson_title}</p>
                        <p className="text-sm text-muted-foreground">{attempt.subject_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(attempt.created_at), 'PPP p')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getScoreColor(attempt.score)} border font-semibold`}>
                        {attempt.score}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!quizLoading && !quizError && (!quizAttempts || quizAttempts.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No quiz attempts found for this student.
              </p>
            )}
          </TabsContent>

          <TabsContent value="lessons" className="space-y-4">
            {lessonLoading && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </div>
            )}
            
            {lessonError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load lesson completions: {lessonError.message}</AlertDescription>
              </Alert>
            )}
            
            {!lessonLoading && !lessonError && lessonCompletions && lessonCompletions.length > 0 && (
              <div className="space-y-4">
                {lessonCompletions.map((completion) => (
                  <div key={completion.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">{completion.lesson_title}</p>
                      <p className="text-sm text-muted-foreground">{completion.subject_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Completed on {format(new Date(completion.completed_at), 'PPP p')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!lessonLoading && !lessonError && (!lessonCompletions || lessonCompletions.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No lesson completions found for this student.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StudentAcademicDetails;
