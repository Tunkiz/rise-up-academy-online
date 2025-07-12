import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminDashboard from '@/components/admin/AdminDashboard';
import UserManagementTable from '@/components/admin/UserManagementTable';
import SubjectManagement from '@/components/admin/SubjectManagement';
import LessonManagement from '@/components/admin/LessonManagement';
import EnrollmentManagement from '@/components/admin/EnrollmentManagement';
import { useAuth } from '@/contexts/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  GraduationCap,
  CreditCard,
  Settings
} from 'lucide-react';

const AdminPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="container mx-auto py-10 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don't have permission to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, content, and platform settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-fit lg:grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Subjects</span>
          </TabsTrigger>
          <TabsTrigger value="lessons" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Lessons</span>
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagementTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Subject Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubjectManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lessons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Lesson Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LessonManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <EnrollmentManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Platform Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Platform Settings</h3>
                  <p className="text-muted-foreground">
                    Advanced platform configuration options will be available here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
