
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, BookOpen, CheckCircle, Target, Clock, TrendingUp, Settings2, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, isToday, isAfter } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  progress: {
    label: "Progress (%)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const dashboardTourSteps = [
    { target: '#stats-cards', title: 'Learning Stats', content: 'Track your learning progress with these key metrics.', placement: 'bottom' as const },
    { target: '#progress-card', title: 'Your Progress', content: 'This section shows your progress across all subjects you are enrolled in.', placement: 'bottom' as const },
    { target: '#activity-card', title: 'Recent Activity', content: 'See your most recent learning activities here.', placement: 'left' as const },
    { target: '#deadlines-card', title: 'Upcoming Deadlines', content: "Keep an eye on your upcoming lesson deadlines here. Don't miss them!", placement: 'left' as const },
    { target: '#quick-actions', title: 'Quick Actions', content: 'Access frequently used features and tools here.', placement: 'right' as const },
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

  const { data: learningStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['learning_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('get_user_learning_stats', {
        p_user_id: user.id,
      });
      if (error) {
        console.error("Error fetching learning stats:", error);
        throw new Error(error.message);
      }
      return data?.[0] || { lessons_completed: 0, total_study_hours: 0, active_subjects: 0 };
    },
    enabled: !!user,
  });

  const { data: progressData, isLoading: isProgressLoading } = useQuery({
    queryKey: ['progress', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('student_progress')
        .select('progress, subjects (id, name)')
        .eq('user_id', user.id)
        .order('progress', { ascending: false });
      
      if (error) {
        console.error("Error fetching progress:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['recent_activity', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('recent_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error("Error fetching recent activity:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user,
  });

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
      return data || [];
    },
    enabled: !!user,
  });

  const chartData = progressData?.map((item) => ({
    subject: item.subjects?.name || 'Unnamed Subject',
    progress: item.progress,
  })) || [];

  const averageProgress = progressData && progressData.length > 0 
    ? progressData.reduce((acc, curr) => acc + (curr.progress || 0), 0) / progressData.length
    : 0;

  return (
  <>
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata.full_name || 'Student'}!</h1>
          <p className="text-muted-foreground mt-2">Here's a snapshot of your learning journey.</p>
        </div>
        <div id="quick-actions" className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/study-planner')}>
            <Target className="mr-2 h-4 w-4" />
            Create Study Plan
          </Button>
          <Button variant="secondary" onClick={() => navigate('/exam-assistance')}>
            <Settings2 className="mr-2 h-4 w-4" />
            Get Exam Help
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div id="stats-cards" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats || isProgressLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(averageProgress)}%</div>
                <Progress value={averageProgress} className="mt-2" />
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{learningStats?.lessons_completed || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{learningStats?.total_study_hours || 0}h</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{learningStats?.active_subjects || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Progress Card */}
        <Card id="progress-card" className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Book className="mr-2 h-5 w-5" />
              Subject Progress
            </CardTitle>
            <CardDescription>Your progress across all enrolled subjects.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isProgressLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
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
                    <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No progress tracked yet.</p>
                  <p className="text-sm">Complete lessons to see your progress!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Card */}
        <Card id="activity-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest learning activities.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="rounded-full bg-muted p-2">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm">{activity.activity}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.date), 'PP p')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity.</p>
                <p className="text-sm">Start learning to see your activities!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deadlines Card */}
        <Card id="deadlines-card" className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Stay on track with your lessons and assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            {isDeadlinesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : deadlinesData && deadlinesData.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {deadlinesData.map((deadline) => (
                  <Link
                    key={deadline.id}
                    to={`/subject/${deadline.subject_id}/topic/${deadline.topic_id}/lesson/${deadline.id}`}
                    className="block"
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base line-clamp-1">{deadline.title}</CardTitle>
                            <CardDescription className="line-clamp-1">{deadline.subject_name}</CardDescription>
                          </div>
                          {isToday(new Date(deadline.due_date)) ? (
                            <Badge variant="destructive">Due Today</Badge>
                          ) : isAfter(new Date(deadline.due_date), new Date()) ? (
                            <Badge>Upcoming</Badge>
                          ) : (
                            <Badge variant="secondary">Past Due</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Due: {format(new Date(deadline.due_date), 'PPP')}
                        </p>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming deadlines.</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Tour Dialog */}
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
  );
};

export default Dashboard;
