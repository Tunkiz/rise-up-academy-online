import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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

const chartConfig = {
  progress: {
    label: "Progress (%)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const dashboardTourSteps = [
    { target: '#progress-card', title: 'Your Progress', content: 'This section shows your progress across all subjects you are enrolled in.', placement: 'bottom' as const, path: '/dashboard' },
    { target: '#deadlines-card', title: 'Upcoming Deadlines', content: "Keep an eye on your upcoming lesson deadlines here. Don't miss them!", placement: 'left' as const, path: 'dashboard' },
    { target: '#nav-learning-portal', title: 'Learning Portal', content: 'This is your gateway to all subjects and lessons. Let\'s go there.', placement: 'bottom' as const, path: '/dashboard' },
    { target: '#learning-portal-title', title: 'Welcome to the Learning Portal', content: 'Here you can see all the subjects you are enrolled in. Click any subject to start learning.', placement: 'bottom' as const, path: '/learning-portal' },
    { target: '#nav-exam-assistance', title: 'Exam Assistance', content: 'Stuck on a topic? Our AI tutor can help. Let\'s check it out.', placement: 'bottom' as const, path: '/learning-portal' },
    { target: '#exam-assistance-title', title: 'AI-Powered Exam Assistance', content: 'Use our AI Tutor to get explanations, solve problems, and prepare for your exams.', placement: 'bottom' as const, path: '/exam-assistance' },
    { target: '#nav-study-planner', title: 'Study Planner', content: 'Create a personalized study plan with our AI-powered planner.', placement: 'bottom' as const, path: '/exam-assistance' },
    { target: 'h1', title: 'AI Study Planner', content: 'Generate a study schedule tailored to your needs to stay organized and on track.', placement: 'bottom' as const, path: '/study-planner' },
    { target: '#nav-resource-library', title: 'Resource Library', content: 'Access a collection of study materials and past papers.', placement: 'bottom' as const, path: '/study-planner' },
    { target: 'h1', title: 'Resource Library', content: 'Find and download useful resources to aid your learning.', placement: 'bottom' as const, path: '/resource-library' },
    { target: '#user-menu-button', title: 'Your Account', content: 'Manage your profile and account settings here.', placement: 'left' as const, path: '/dashboard' },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startTour, isTourCompleted, markTourAsCompleted } = useTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const tourId = 'dashboard';

  useEffect(() => {
    // Only show tour prompt if user has logged in and hasn't completed the tour
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
    startTour(dashboardTourSteps, tourId);
  };
  
  const handleSkipTour = () => {
      setShowTourPrompt(false);
      markTourAsCompleted(tourId);
  };

  const { data: progressData, isLoading: isProgressLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('student_progress')
        .select(`progress, subjects (name)`)
        .eq('user_id', user.id);
      
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const chartData = progressData?.map((item) => ({
    subject: item.subjects?.name || 'Unnamed Subject',
    progress: item.progress,
  })) || [];

  const { data: deadlinesData, isLoading: isDeadlinesLoading } = useQuery({
    queryKey: ['lesson_deadlines', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('get_user_lesson_deadlines', {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching lesson deadlines:", error);
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user,
  });

  return (
  <>
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata.full_name || 'Student'}!</h1>
          <p className="text-muted-foreground mt-2">Here's a snapshot of your learning journey.</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* My Progress Card */}
        <Card id="progress-card" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Book className="mr-2 h-5 w-5" />
              My Progress
            </CardTitle>
            <CardDescription>Your overall progress across all subjects.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isProgressLoading ? <p>Loading progress...</p> : null}
              {chartData && chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="subject"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="progress" fill="var(--color-progress)" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : !isProgressLoading && (
                <p className="text-muted-foreground text-sm">No progress tracked yet. Complete a lesson to see your progress!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines Card */}
        <Card id="deadlines-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Don't miss these important dates.</CardDescription>
          </CardHeader>
          <CardContent>
            {isDeadlinesLoading ? <p>Loading deadlines...</p> : null}
            {deadlinesData && deadlinesData.length > 0 ? (
              <ul className="space-y-3">
                {deadlinesData.map((deadline) => (
                  <li key={deadline.id}>
                    <Link to={`/subject/${deadline.subject_id}/topic/${deadline.topic_id}/lesson/${deadline.id}`} className="flex items-start p-2 -m-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="w-2 h-2 bg-primary rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium">{deadline.title}</p>
                        <p className="text-sm text-muted-foreground">{deadline.subject_name}</p>
                        <p className="text-sm text-muted-foreground">Due: {format(new Date(deadline.due_date), 'PPP')}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : !isDeadlinesLoading && (
              <p className="text-muted-foreground text-sm">No upcoming deadlines. You're all caught up!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    <AlertDialog open={showTourPrompt} onOpenChange={setShowTourPrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome to your Dashboard!</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like a quick tour of the platform features?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkipTour}>No, thanks</AlertDialogCancel>
          <AlertDialogAction onClick={handleStartTour}>Show me around</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  )
};
export default Dashboard;
