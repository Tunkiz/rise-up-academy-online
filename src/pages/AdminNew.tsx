import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
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
import EnrollmentManagement from '@/components/admin/EnrollmentManagement';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  GraduationCap,
  CreditCard,
  Settings
} from 'lucide-react';

type Subject = Tables<'subjects'>;
type Resource = Tables<'resources'>;

const AdminPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [grade, setGrade] = useState(9);
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('resources');

  const { data: resources, isLoading: isLoadingResources } = useQuery({
    queryKey: ['admin-resources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('resources').select('*');
      if (error) throw error;
      return data as Resource[];
    },
  });

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      return data as Subject[];
    },
  });

  const createResourceMutation = useMutation({
    mutationFn: async (resource: { title: string; description: string; subject_id: string; file_url: string; grade: number }) => {
      const { data, error } = await supabase.from('resources').insert(resource);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      setTitle("");
      setDescription("");
      setSubjectId("");
      setFileUrl("");
      setGrade(9);
      setOpen(false);
      toast.success('Resource created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create resource: ${error.message}`);
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      toast.success('Resource deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete resource: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!user) {
      toast.error("You must be logged in to access this page.");
    }
  }, [user]);

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
        <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4">
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Users</span>
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

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Resources Management</h2>
            <Button onClick={() => setOpen(true)}>Create Resource</Button>
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create New Resource</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter the details for the new resource.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subject" className="text-right">
                    Subject
                  </Label>
                  <Select onValueChange={setSubjectId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fileUrl" className="text-right">
                    File URL
                  </Label>
                  <Input id="fileUrl" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grade" className="text-right">
                    Grade
                  </Label>
                  <Input
                    type="number"
                    id="grade"
                    value={grade.toString()}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="col-span-3"
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => createResourceMutation.mutate({ title, description, subject_id: subjectId, file_url: fileUrl, grade })}>
                  {createResourceMutation.isPending ? "Creating..." : "Create"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
              <CardDescription>Manage resources available to students.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingResources ? (
                    <>
                      <TableRow>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                      </TableRow>
                    </>
                  ) : resources?.length ? resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>{resource.title}</TableCell>
                      <TableCell>{resource.description}</TableCell>
                      <TableCell>{subjects?.find(subject => subject.id === resource.subject_id)?.name || 'N/A'}</TableCell>
                      <TableCell>{resource.grade}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/admin/user/${resource.id}`}>View</Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteResourceMutation.mutate(resource.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No resources found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">User Management</h3>
                <p className="text-muted-foreground mb-4">
                  View and manage user accounts, roles, and permissions.
                </p>
                <Button asChild>
                  <Link to="/admin/users">Go to User Management</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollments/Payments Tab */}
        <TabsContent value="enrollments" className="space-y-6">
          <EnrollmentManagement />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Platform Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Platform Settings</h3>
                <p className="text-muted-foreground">
                  Advanced platform configuration options will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
