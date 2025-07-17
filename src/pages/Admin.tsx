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
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
import { useCreateResource } from "@/hooks/useCreateResource";

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Get the tab from URL parameters, default to "dashboard"
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Handle tab changes
  const handleTabChange = (newTab: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', newTab);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

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

  const createResourceMutation = useCreateResource();

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
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className="grid grid-cols-4 w-full max-w-xl mx-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default AdminPage;
