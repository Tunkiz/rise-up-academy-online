
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "./StatCard";
import { Users, Building, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

type TenantStats = {
  id: string;
  name: string;
  created_at: string;
  user_count: number;
  subject_count: number;
  lesson_count: number;
};

type SuperAdminStats = {
  total_tenants_count: number;
  total_users_across_all_tenants: number;
  total_active_users_last_30_days: number;
  tenants_with_stats: TenantStats[];
};

const SuperAdminDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['super_admin_stats'],
    queryFn: async (): Promise<SuperAdminStats | null> => {
      const { data, error } = await supabase.rpc('get_super_admin_stats');
      if (error) {
        console.error("Error fetching super admin stats:", error);
        throw new Error(error.message);
      }
      const statsData = data?.[0];
      if (!statsData) {
        return null;
      }

      return {
        ...statsData,
        tenants_with_stats: (statsData.tenants_with_stats as TenantStats[] | null) ?? [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (error) {
    return (
        <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle>Error loading super admin dashboard</CardTitle>
                <CardDescription>{error.message}</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tenants" value={data?.total_tenants_count ?? 0} icon={Building} isLoading={isLoading} />
        <StatCard title="Total Users" value={data?.total_users_across_all_tenants ?? 0} icon={Users} isLoading={isLoading} />
        <StatCard title="Active Users (30d)" value={data?.total_active_users_last_30_days ?? 0} icon={Calendar} isLoading={isLoading} />
        <StatCard title="Platform Health" value="Operational" icon={BarChart3} isLoading={isLoading} />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="mr-2 h-5 w-5" />
            Tenant Overview
          </CardTitle>
          <CardDescription>All organizations using the platform.</CardDescription>
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
                  <TableHead>Organization</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Subjects</TableHead>
                  <TableHead className="text-right">Lessons</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.tenants_with_stats?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{format(new Date(tenant.created_at), 'PP')}</TableCell>
                    <TableCell className="text-right">{tenant.user_count}</TableCell>
                    <TableCell className="text-right">{tenant.subject_count}</TableCell>
                    <TableCell className="text-right">{tenant.lesson_count}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">Active</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.tenants_with_stats || data.tenants_with_stats.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-4">No tenants found.</TableCell>
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

export default SuperAdminDashboard;
