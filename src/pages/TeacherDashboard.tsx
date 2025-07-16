import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  ClipboardList,
  Settings,
  FileText, 
  ExternalLink, 
  Upload
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

// Import existing components we'll reuse
import UserManagementTable from "@/components/admin/UserManagementTable";
import LessonManagement from "@/components/admin/LessonManagement";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Get user profile
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Overview stats for teachers
  const { data: teacherStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['teacher_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get subjects the teacher is assigned to
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('tenant_id', profile?.tenant_id);

      if (subjectsError) throw subjectsError;

      // Get total students enrolled in teacher's subjects
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('user_id, subject_id, subjects(*)')
        .eq('status', 'payment_approved')
        .in('subject_id', subjects?.map(s => s.id) || []);

      if (enrollmentsError) throw enrollmentsError;

      // Get total lessons created by teacher
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('tenant_id', profile?.tenant_id);

      if (lessonsError) throw lessonsError;

      // Get total resources created by teacher
      const { data: resources, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('tenant_id', profile?.tenant_id);

      if (resourcesError) throw resourcesError;

      const uniqueStudents = new Set(enrollments?.map(e => e.user_id) || []).size;

      return {
        totalSubjects: subjects?.length || 0,
        totalStudents: uniqueStudents,
        totalLessons: lessons?.length || 0,
        totalResources: resources?.length || 0,
        subjects: subjects || [],
        enrollments: enrollments || [],
        recentLessons: lessons?.slice(-5) || [],
        recentResources: resources?.slice(-5) || [],
      };
    },
    enabled: !!user && !!profile?.tenant_id,
  });

  // Subject Content Management Component
  const SubjectContentManagement = () => {
    const [selectedSubject, setSelectedSubject] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [grade, setGrade] = useState(9);
    const [uploadType, setUploadType] = useState<'url' | 'file'>('url');
    const [fileUrl, setFileUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [open, setOpen] = useState(false);

    // Get subjects for dropdown
    const { data: subjects } = useQuery({
      queryKey: ['teacher-subjects'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('tenant_id', profile?.tenant_id)
          .order('name');
        if (error) throw error;
        return data;
      },
      enabled: !!profile?.tenant_id,
    });

    // Get resources for selected subject
    const { data: resources, isLoading } = useQuery({
      queryKey: ['subject-resources', selectedSubject],
      queryFn: async () => {
        if (!selectedSubject) return [];
        const { data, error } = await supabase
          .from('resources')
          .select('*, subjects(name)')
          .eq('subject_id', selectedSubject)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      },
      enabled: !!selectedSubject,
    });

    const createResourceMutation = useMutation({
      mutationFn: async (data: {
        title: string;
        description: string;
        subject_id: string;
        grade: number;
        uploadType: 'url' | 'file';
        fileUrl?: string;
        selectedFile?: File | null;
      }) => {
        if (!profile?.tenant_id) {
          throw new Error('User tenant not found');
        }

        let finalFileUrl = '';

        // Handle file upload if file is selected
        if (data.uploadType === 'file' && data.selectedFile) {
          const fileExt = data.selectedFile.name.split('.').pop();
          const filePath = `${user?.id}/${Date.now()}-resource.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('resource_files')
            .upload(filePath, data.selectedFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('resource_files')
            .getPublicUrl(filePath);

          finalFileUrl = publicUrl;
        } else if (data.uploadType === 'url' && data.fileUrl) {
          finalFileUrl = data.fileUrl;
        }

        const { error } = await supabase.from('resources').insert({
          title: data.title,
          description: data.description,
          subject_id: data.subject_id,
          grade: data.grade,
          file_url: finalFileUrl,
          tenant_id: profile.tenant_id,
        });
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['subject-resources'] });
        toast.success('Resource created successfully!');
        setTitle("");
        setDescription("");
        setFileUrl("");
        setSelectedFile(null);
        setUploadType('url');
        setGrade(9);
        setOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to create resource: ${error.message}`);
      },
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedSubject) {
        toast.error('Please select a subject');
        return;
      }
      createResourceMutation.mutate({
        title,
        description,
        subject_id: selectedSubject,
        grade,
        uploadType,
        fileUrl,
        selectedFile,
      });
    };

    // Helper function to determine file type and icon
    const getFileIcon = (url: string) => {
      if (!url) return null;
      
      const extension = url.split('.').pop()?.toLowerCase() || '';
      
      if (['pdf'].includes(extension)) {
        return <FileText className="w-4 h-4 text-red-600" />;
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        return <FileText className="w-4 h-4 text-blue-600" />;
      } else if (['doc', 'docx'].includes(extension)) {
        return <FileText className="w-4 h-4 text-blue-800" />;
      } else if (['xls', 'xlsx'].includes(extension)) {
        return <FileText className="w-4 h-4 text-green-600" />;
      } else if (['ppt', 'pptx'].includes(extension)) {
        return <FileText className="w-4 h-4 text-orange-600" />;
      } else {
        return <FileText className="w-4 h-4 text-gray-600" />;
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Subject Content Management</h2>
            <p className="text-muted-foreground">Add resources and materials to your subjects</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                <DialogDescription>
                  Add a new resource to your subject. You can upload a file or provide a URL.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="grade">Grade Level</Label>
                    <Select value={grade.toString()} onValueChange={(value) => setGrade(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 4 }, (_, i) => i + 9).map((gradeLevel) => (
                          <SelectItem key={gradeLevel} value={gradeLevel.toString()}>
                            Grade {gradeLevel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Upload Type</Label>
                    <div className="flex gap-4 mt-2">
                      <Button
                        type="button"
                        variant={uploadType === 'url' ? 'default' : 'outline'}
                        onClick={() => setUploadType('url')}
                      >
                        URL
                      </Button>
                      <Button
                        type="button"
                        variant={uploadType === 'file' ? 'default' : 'outline'}
                        onClick={() => setUploadType('file')}
                      >
                        File Upload
                      </Button>
                    </div>
                  </div>

                  {uploadType === 'url' ? (
                    <div>
                      <Label htmlFor="fileUrl">File URL</Label>
                      <Input
                        id="fileUrl"
                        type="url"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="https://example.com/file.pdf"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="file">Select File</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createResourceMutation.isPending}>
                    {createResourceMutation.isPending ? 'Creating...' : 'Create Resource'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          <div>
            <Label>Select Subject to View Resources</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSubject && (
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
                <CardDescription>
                  Resources for {subjects?.find(s => s.id === selectedSubject)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading resources...</div>
                ) : resources && resources.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources.map((resource) => (
                        <TableRow key={resource.id}>
                          <TableCell className="font-medium">{resource.title}</TableCell>
                          <TableCell>{resource.description}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">Grade {resource.grade}</Badge>
                          </TableCell>
                          <TableCell>
                            {resource.file_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(resource.file_url, '_blank')}
                              >
                                {getFileIcon(resource.file_url)}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">No file</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {resource.created_at ? format(new Date(resource.created_at), 'PPP') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No resources found for this subject. Add some resources to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your students, subjects, and content</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="subjects">Subject Content</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teacherStats?.totalSubjects || 0}</div>
                <p className="text-xs text-muted-foreground">Subjects you manage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teacherStats?.totalStudents || 0}</div>
                <p className="text-xs text-muted-foreground">Enrolled students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teacherStats?.totalLessons || 0}</div>
                <p className="text-xs text-muted-foreground">Lessons created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teacherStats?.totalResources || 0}</div>
                <p className="text-xs text-muted-foreground">Resources uploaded</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Lessons</CardTitle>
                <CardDescription>Your latest lesson activities</CardDescription>
              </CardHeader>
              <CardContent>
                {teacherStats?.recentLessons && teacherStats.recentLessons.length > 0 ? (
                  <div className="space-y-2">
                    {teacherStats.recentLessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {lesson.due_date ? format(new Date(lesson.due_date), 'PPP') : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="secondary">Grade {lesson.grade}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No recent lessons</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Resources</CardTitle>
                <CardDescription>Your latest uploaded resources</CardDescription>
              </CardHeader>
              <CardContent>
                {teacherStats?.recentResources && teacherStats.recentResources.length > 0 ? (
                  <div className="space-y-2">
                    {teacherStats.recentResources.map((resource) => (
                      <div key={resource.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{resource.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {resource.created_at ? format(new Date(resource.created_at), 'PPP') : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="secondary">Grade {resource.grade}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No recent resources</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>Manage students enrolled in your subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <SubjectContentManagement />
        </TabsContent>

        <TabsContent value="lessons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Management</CardTitle>
              <CardDescription>Create and manage your lessons</CardDescription>
            </CardHeader>
            <CardContent>
              <LessonManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={profile?.full_name || ''} disabled />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ''} disabled />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={profile?.role || ''} disabled />
                  </div>
                  <div>
                    <Label htmlFor="category">Teaching Category</Label>
                    <Input id="category" value={profile?.learner_category || ''} disabled />
                  </div>
                </div>
                <div className="pt-4">
                  <Button variant="outline" disabled>
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Profile (Coming Soon)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherDashboard;
