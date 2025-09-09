import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  BookOpen, 
  Activity, 
  GraduationCap, 
  ClipboardList, 
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  UserCog
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  students: {
    label: "Active Students",
    color: "hsl(var(--primary))",
  },
  progress: {
    label: "Average Progress",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig;

const AdminDashboard = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();

  // Get admin/teacher stats
  const { data: adminStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Get total students
      const { count: totalStudents } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact' })
        .eq('role', 'student');

      // Get total subjects
      const { count: totalSubjects } = await supabase
        .from('subjects')
        .select('*', { count: 'exact' });

      // Get total lessons
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact' });

      // Get active students (those who have progress)
      const { count: activeStudents } = await supabase
        .from('student_progress')
        .select('user_id', { count: 'exact' });

      return {
        totalStudents: totalStudents || 0,
        totalSubjects: totalSubjects || 0,
        totalLessons: totalLessons || 0,
        activeStudents: activeStudents || 0,
      };
    },
    enabled: !!user && (isAdmin || isTeacher),
  });

  // Get teacher and tutor counts
  const { data: staffCounts, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff_counts'],
    queryFn: async () => {
      const { data: teacherData, error: teacherError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      
      const { data: tutorData, error: tutorError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'tutor');

      if (teacherError) throw teacherError;
      if (tutorError) throw tutorError;

      return {
        teachers: teacherData?.length || 0,
        tutors: tutorData?.length || 0,
        total: (teacherData?.length || 0) + (tutorData?.length || 0)
      };
    },
    enabled: !!user && (isAdmin || isTeacher),
  });

  // Get recent student activity
  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['admin_recent_activity', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('recent_activity')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("Error fetching recent activity:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user && (isAdmin || isTeacher),
  });

  // Get subject performance data
  const { data: subjectPerformance, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['subject_performance', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('student_progress')
        .select('progress, subjects(name)')
        .order('progress', { ascending: false });
      
      if (error) {
        console.error("Error fetching subject performance:", error);
        throw new Error(error.message);
      }
      
      // Group by subject and calculate averages
      const subjectGroups = data?.reduce((acc, curr) => {
        const subjectName = curr.subjects?.name || 'Unknown';
        if (!acc[subjectName]) {
          acc[subjectName] = { total: 0, count: 0 };
        }
        acc[subjectName].total += curr.progress || 0;
        acc[subjectName].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      return Object.entries(subjectGroups || {}).map(([subject, data]) => ({
        subject,
        average: Math.round(data.total / data.count),
      }));
    },
    enabled: !!user && (isAdmin || isTeacher),
  });

  const getRoleTitle = () => {
    if (isAdmin) return "Administrator";
    if (isTeacher) return "Teacher";
    return "Staff Member";
  };

  const getActivityIcon = (activity: string) => {
    if (activity?.includes('completed')) {
      return <CheckCircle className="h-4 w-4 text-green-500 mt-1" />;
    }
    if (activity?.includes('quiz')) {
      return <ClipboardList className="h-4 w-4 text-blue-500 mt-1" />;
    }
    return <Clock className="h-4 w-4 text-orange-500 mt-1" />;
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {getRoleTitle()} Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.user_metadata.full_name}! Here's your platform overview.
          </p>
        </div>
      </div>

      {/* Admin Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{adminStats?.totalStudents || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {adminStats?.activeStudents || 0} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{adminStats?.totalSubjects || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Available courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{adminStats?.totalLessons || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Learning modules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{adminStats?.activeStudents || 0}</div>
                <Progress 
                  value={adminStats?.totalStudents ? (adminStats.activeStudents / adminStats.totalStudents) * 100 : 0} 
                  className="mt-2" 
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers & Tutors</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStaff ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{staffCounts?.total || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Teaching staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStaff ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{staffCounts?.teachers || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Certified teachers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tutors</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStaff ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{staffCounts?.tutors || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Support tutors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Subject Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Subject Performance Overview
            </CardTitle>
            <CardDescription>
              Average student progress across all subjects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPerformance ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="subject" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="average" fill="var(--color-students)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Student Activity
            </CardTitle>
            <CardDescription>
              Latest learning activities across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={`loading-skeleton-${i}`} className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {recentActivity && recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.slice(0, 8).map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.activity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Student Activity
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.activity}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used administrative tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin?tab=subjects')}
              >
                <BookOpen className="h-6 w-6" />
                <span>Manage Subjects</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin?tab=lessons')}
              >
                <GraduationCap className="h-6 w-6" />
                <span>Manage Lessons</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin?tab=payments')}
              >
                <BarChart3 className="h-6 w-6" />
                <span>Payment Approvals</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/admin?tab=users')}
              >
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
