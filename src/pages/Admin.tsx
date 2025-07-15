import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "@/components/admin/AdminDashboard";
import UserManagementTable from "@/components/admin/UserManagementTable";
import SubjectManagement from "@/components/admin/SubjectManagement";
import LessonManagement from "@/components/admin/LessonManagement";
import PaymentApprovalTable from "@/components/admin/PaymentApprovalTable";
import { FileText, ExternalLink, Upload } from "lucide-react";

type Subject = Tables<'subjects'>;
type Resource = Tables<'resources'>;

// Helper function to determine file type and icon
const getFileIcon = (url: string) => {
  if (!url) return null;
  
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  if (['pdf'].includes(extension)) {
    return <FileText className="w-4 h-4 text-red-600" />;
  } else if (['doc', 'docx'].includes(extension)) {
    return <FileText className="w-4 h-4 text-blue-600" />;
  } else if (['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
    return <FileText className="w-4 h-4 text-green-600" />;
  } else if (url.startsWith('http')) {
    return <ExternalLink className="w-4 h-4 text-purple-600" />;
  }
  
  return <FileText className="w-4 h-4 text-gray-600" />;
};

const AdminPage = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'url' | 'file'>('url');
  const [grade, setGrade] = useState(9);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    mutationFn: async (data: { 
      title: string; 
      description: string; 
      subject_id: string; 
      grade: number; 
      uploadType: 'url' | 'file';
      fileUrl?: string;
      selectedFile?: File | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      let finalFileUrl = '';

      // Handle file upload if file is selected
      if (data.uploadType === 'file' && data.selectedFile) {
        const fileExt = data.selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `resources/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resource_files')
          .upload(filePath, data.selectedFile);

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get the public URL
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
      queryClient.invalidateQueries({ queryKey: ['admin-resources'] });
      toast.success('Resource created successfully!');
      setTitle("");
      setDescription("");
      setSubjectId("");
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
  
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => setOpen(true)}>Create Resource</Button>
      </div>
      
      <Tabs defaultValue="dashboard" className="space-y-8">        <TabsList className="grid grid-cols-6 w-full max-w-2xl mx-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <AdminDashboard />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage users in your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-4">
          <PaymentApprovalTable />
        </TabsContent>
        
        <TabsContent value="resources">
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
              <Label htmlFor="uploadType" className="text-right">
                Upload Type
              </Label>
              <Select value={uploadType} onValueChange={(value: 'url' | 'file') => setUploadType(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">External URL</SelectItem>
                  <SelectItem value="file">Upload File</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {uploadType === 'url' ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fileUrl" className="text-right">
                  File URL
                </Label>
                <Input 
                  id="fileUrl" 
                  value={fileUrl} 
                  onChange={(e) => setFileUrl(e.target.value)} 
                  className="col-span-3" 
                  placeholder="https://example.com/document.pdf"
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">
                  Upload File
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="file" 
                    type="file" 
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports PDF, Word documents, and images
                  </p>
                </div>
              </div>
            )}
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
            <AlertDialogAction 
              onClick={() => {
                console.log('Create button clicked', { title, description, subjectId, uploadType, fileUrl, selectedFile });
                
                // Validation
                if (!title.trim()) {
                  toast.error('Title is required');
                  return;
                }
                if (!subjectId) {
                  toast.error('Please select a subject');
                  return;
                }
                if (uploadType === 'url' && !fileUrl.trim()) {
                  toast.error('Please provide a file URL');
                  return;
                }
                if (uploadType === 'file' && !selectedFile) {
                  toast.error('Please select a file to upload');
                  return;
                }
                
                createResourceMutation.mutate({ 
                  title, 
                  description, 
                  subject_id: subjectId, 
                  grade,
                  uploadType,
                  fileUrl,
                  selectedFile
                });
              }}
              disabled={createResourceMutation.isPending}
            >
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
              ) : resources?.map((resource) => (
                 <TableRow key={resource.id}>
                   <TableCell>
                     <div className="flex items-center gap-2">
                       {getFileIcon(resource.file_url || '')}
                       {resource.title}
                     </div>
                   </TableCell>
                   <TableCell>{resource.description}</TableCell>
                   <TableCell>{subjects?.find(subject => subject.id === resource.subject_id)?.name || 'N/A'}</TableCell>
                   <TableCell>{resource.grade}</TableCell>
                   <TableCell className="text-right">
                     <div className="flex items-center gap-2 justify-end">
                       {resource.file_url ? (
                         <Button variant="ghost" size="sm" asChild>
                           <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                             View
                           </a>
                         </Button>
                       ) : (
                         <Button variant="ghost" size="sm" disabled>
                           No File
                         </Button>
                       )}
                       <Button variant="destructive" size="sm" onClick={() => deleteResourceMutation.mutate(resource.id)}>
                         Delete
                       </Button>
                     </div>
                   </TableCell>
                 </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
          <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Management</CardTitle>
              <CardDescription>Manage subjects for your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <SubjectManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="lessons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Management</CardTitle>
              <CardDescription>Create and manage lessons across all subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <LessonManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
