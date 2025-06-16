
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "./StatCard";
import { Users, Book, FileText, CheckCircle, HelpCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import SuperAdminDashboard from "./SuperAdminDashboard";

type PopularSubject = {
  id: string;
  name: string;
  student_count: number;
};

type DashboardStats = {
  total_users_count: number;
  new_users_last_30_days: number;
  total_subjects_count: number;
  total_lessons_count: number;
  total_resources_count: number;
  total_lessons_completed: number;
  total_quizzes_attempted: number;
  most_popular_subjects: PopularSubject[];
};

const AdminDashboard = () => {
  // Check if current user is super admin
  const { data: isSuperAdmin, isLoading: isLoadingSuperAdmin } = useQuery({
    queryKey: ['is_super_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) {
        console.error("Error checking super admin status:", error);
        return false;
      }
      return data;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin_dashboard_stats'],
    queryFn: async (): Promise<DashboardStats | null> => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) {
        console.error("Error fetching admin stats:", error);
        throw new Error(error.message);
      }
      const statsData = data?.[0];
      if (!statsData) {
        return null;
      }

      return {
        ...statsData,
        most_popular_subjects: (statsData.most_popular_subjects as PopularSubject[] | null) ?? [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !isLoadingSuperAdmin && !isSuperAdmin, // Only load if not super admin
  });

  // Show super admin dashboard if user is super admin
  if (isLoadingSuperAdmin) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  // Regular tenant admin dashboard
  if (error) {
    return (
        <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle>Error loading dashboard</CardTitle>
                <CardDescription>{error.message}</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={data?.total_users_count ?? 0} icon={Users} isLoading={isLoading} />
        <StatCard title="New Sign-ups (30d)" value={data?.new_users_last_30_days ?? 0} icon={Users} isLoading={isLoading} />
        <StatCard title="Total Subjects" value={data?.total_subjects_count ?? 0} icon={Book} isLoading={isLoading} />
        <StatCard title="Total Lessons" value={data?.total_lessons_count ?? 0} icon={FileText} isLoading={isLoading} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Total Lessons Completed" value={data?.total_lessons_completed ?? 0} icon={CheckCircle} isLoading={isLoading} />
        <StatCard title="Total Quizzes Attempted" value={data?.total_quizzes_attempted ?? 0} icon={HelpCircle} isLoading={isLoading} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Most Popular Subjects
          </CardTitle>
          <CardDescription>Top 5 subjects by student enrollment in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 px-4 pb-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Enrolled Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.most_popular_subjects?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">
                        <Link to={`/subject/${subject.id}`} className="hover:underline">{subject.name}</Link>
                    </TableCell>
                    <TableCell className="text-right">{subject.student_count}</TableCell>
                  </TableRow>
                ))}
                {(!data?.most_popular_subjects || data.most_popular_subjects.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">No data available.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
