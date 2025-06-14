
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Book, Calendar, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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

  const { data: deadlinesData, isLoading: isDeadlinesLoading } = useQuery({
    queryKey: ['deadlines', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('deadlines')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['activity', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('recent_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  return (
  <div className="container py-10">
    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata.full_name || 'Student'}!</h1>
        <p className="text-muted-foreground mt-2">Here's a snapshot of your learning journey.</p>
      </div>
      <Button onClick={handleLogout} variant="outline">
        <LogOut className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>

    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {/* My Progress Card */}
      <Card className="lg:col-span-2">
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
            {progressData && progressData.length > 0 ? (
              progressData.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{item.subjects?.name || 'Unnamed Subject'}</span>
                    <span className="text-sm text-muted-foreground">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} />
                </div>
              ))
            ) : !isProgressLoading && (
              <p className="text-muted-foreground text-sm">No progress tracked yet. Complete a lesson to see your progress!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines Card */}
      <Card>
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
                <li key={deadline.id} className="flex items-start">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">{deadline.title}</p>
                    <p className="text-sm text-muted-foreground">Due: {format(new Date(deadline.due_date), 'PPP')}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : !isDeadlinesLoading && (
            <p className="text-muted-foreground text-sm">No upcoming deadlines. You're all caught up!</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>What's new in your courses.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isActivityLoading ? <p className="text-center py-4">Loading activity...</p> : null}
          {activityData && activityData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityData.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.course}</TableCell>
                    <TableCell>{activity.activity}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatDistanceToNow(new Date(activity.date), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !isActivityLoading && (
            <p className="text-muted-foreground text-sm text-center py-4">No recent activity.</p>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
  )
};
export default Dashboard;
