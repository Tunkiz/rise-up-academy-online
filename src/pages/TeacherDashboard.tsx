import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  ClipboardList,
  ChevronsUpDown,
  Plus,
  Clock,
  Edit,
  Trash2,
  LinkIcon,
  FileText,
  ExternalLink
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TopicList from "@/components/admin/TopicList";

// Import existing components we'll reuse
import UserManagementTable from "@/components/admin/UserManagementTable";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Class scheduling state
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [classLink, setClassLink] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [classStartTime, setClassStartTime] = useState("");
  const [classEndTime, setClassEndTime] = useState("");
  const [editingSchedule, setEditingSchedule] = useState<Tables<'class_schedules'> | null>(null);

  // Get user profile - MOVED TO TOP
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

  // Reset form function
  const resetForm = () => {
    setSelectedSubject("");
    setClassLink("");
    setClassTitle("");
    setClassStartTime("");
    setClassEndTime("");
    setEditingSchedule(null);
  };

  // Get class schedules
  const { data: classSchedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['class-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('tenant_id', profile?.tenant_id)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Helper function to get schedules for a specific subject
  const getSubjectSchedules = (subjectId: string) => {
    return classSchedules?.filter(schedule => schedule.subject_id === subjectId) || [];
  };

  // Create class schedule mutation
  const createClassScheduleMutation = useMutation({
    mutationFn: async (data: {
      subject_id: string;
      title: string;
      meeting_link: string;
      start_time: string;
      end_time: string;
    }) => {
      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      const scheduleData = {
        subject_id: data.subject_id,
        title: data.title,
        meeting_link: data.meeting_link,
        start_time: data.start_time,
        end_time: data.end_time,
        tenant_id: profile.tenant_id,
      };

      if (editingSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('class_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);
        if (error) throw error;
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('class_schedules')
          .insert(scheduleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success(editingSchedule ? 'Class schedule updated successfully!' : 'Class schedule created successfully!');
      resetForm();
      setIsClassDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to ${editingSchedule ? 'update' : 'create'} class schedule: ${error.message}`);
    },
  });

  // Delete class schedule mutation
  const deleteClassScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Class schedule deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete class schedule: ${error.message}`);
    },
  });

  // Handle form submission
  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !classTitle || !classStartTime || !classEndTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    createClassScheduleMutation.mutate({
      subject_id: selectedSubject,
      title: classTitle,
      meeting_link: classLink,
      start_time: classStartTime,
      end_time: classEndTime,
    });
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: Tables<'class_schedules'>) => {
    setEditingSchedule(schedule);
    setSelectedSubject(schedule.subject_id);
    setClassTitle(schedule.title);
    setClassLink(schedule.meeting_link || '');
    setClassStartTime(schedule.start_time);
    setClassEndTime(schedule.end_time);
    setIsClassDialogOpen(true);
  };

  // Overview stats for teachers
  const { data: teacherStats } = useQuery({
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

  // Teacher Subject Management Component
  const TeacherSubjectManagement = () => {
    // Get teacher's subjects
    const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
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

    // Get subject categories for labeling
    const { data: subjectCategories } = useQuery({
      queryKey: ['subject-categories'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('subject_categories')
          .select('*');
        if (error) throw error;
        return data;
      },
    });

    const categoryLabels = {
      'matric_amended': 'Matric Amended Senior Certificate',
      'national_senior': 'National Senior Certificate',
      'senior_phase': 'Senior Phase Certificate'
    };

    // Helper function to get categories for a subject
    const getSubjectCategories = (subjectId: string) => {
      return subjectCategories?.filter(sc => sc.subject_id === subjectId).map(sc => sc.category) || [];
    };

    // Group subjects by their categories
    const groupedSubjects = () => {
      const groups: Record<string, { subject: Tables<'subjects'>; categories: string[] }[]> = {};
      
      // Initialize all category groups
      Object.keys(categoryLabels).forEach(category => {
        groups[category] = [];
      });

      // Add subjects to their respective category groups
      subjects?.forEach(subject => {
        const categories = getSubjectCategories(subject.id);
        
        if (categories.length === 0) {
          // If no categories found in junction table, check legacy category field
          const legacyCategory = subject.category;
          if (legacyCategory) {
            if (!groups[legacyCategory]) groups[legacyCategory] = [];
            groups[legacyCategory].push({ subject, categories: [legacyCategory] });
          }
        } else {
          // Add to each category group
          categories.forEach(category => {
            if (!groups[category]) groups[category] = [];
            groups[category].push({ subject, categories });
          });
        }
      });

      return groups;
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Management</CardTitle>
            <CardDescription>View and manage your assigned subjects and their topics.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSubjects ? (
              <div className="p-4 text-center">Loading subjects...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSubjects()).map(([category, categorySubjects]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-lg font-semibold text-muted-foreground">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h3>
                    <div className="border rounded-md">
                      <ul className="divide-y">
                        {categorySubjects.map(({ subject, categories }) => (
                          <Collapsible asChild key={subject.id}>
                            <li className="list-none">
                              <div className="flex items-start sm:items-center justify-between p-3 hover:bg-muted/50 gap-2">
                                <CollapsibleTrigger asChild>
                                  <button className="flex items-start sm:items-center gap-2 flex-grow text-left min-w-0">
                                    <ChevronsUpDown className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                                    <div className="min-w-0 flex-grow">
                                      <div className="font-medium truncate pr-2">{subject.name}</div>
                                      <div className="flex flex-wrap gap-1 mt-1 sm:mt-0 sm:inline-flex">
                                        {categories.map(cat => (
                                          <Badge key={cat} variant="secondary" className="text-xs">
                                            <span className="hidden sm:inline">{categoryLabels[cat as keyof typeof categoryLabels]}</span>
                                            <span className="sm:hidden">
                                              {cat === 'matric_amended' ? 'Matric' : 
                                               cat === 'national_senior' ? 'NSC' : 
                                               'Senior'}
                                            </span>
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </button>
                                </CollapsibleTrigger>
                              </div>
                              <CollapsibleContent>
                                <div className="p-3 border-t bg-muted/25">
                                  <div className="space-y-4">
                                    <TopicList subjectId={subject.id} />
                                    
                                    {/* Class Schedules Section */}
                                    <div className="border-t pt-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium text-sm">Class Schedules</h4>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            resetForm();
                                            setSelectedSubject(subject.id);
                                            setIsClassDialogOpen(true);
                                          }}
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add Class
                                        </Button>
                                      </div>
                                      
                                      {isLoadingSchedules ? (
                                        <div className="text-sm text-muted-foreground">Loading schedules...</div>
                                      ) : (
                                        <div className="space-y-2">
                                          {getSubjectSchedules(subject.id).map((schedule) => (
                                            <div key={schedule.id} className="flex items-center justify-between p-2 bg-background rounded border">
                                              <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                <div>
                                                  <div className="text-sm font-medium">{schedule.title}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {format(new Date(schedule.start_time), 'PPP p')} - {format(new Date(schedule.end_time), 'p')}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0"
                                                  onClick={() => window.open(schedule.meeting_link, '_blank')}
                                                  disabled={!schedule.meeting_link}
                                                >
                                                  <LinkIcon className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0"
                                                  onClick={() => handleEditSchedule(schedule)}
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 w-6 p-0"
                                                    >
                                                      <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Delete Class Schedule</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Are you sure you want to delete this class schedule? This action cannot be undone.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction
                                                        onClick={() => deleteClassScheduleMutation.mutate(schedule.id)}
                                                        className="bg-destructive hover:bg-destructive/90"
                                                      >
                                                        Delete
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </div>
                                            </div>
                                          ))}
                                          {getSubjectSchedules(subject.id).length === 0 && (
                                            <div className="text-sm text-muted-foreground text-center py-2">
                                              No class schedules yet. Click "Add Class" to create one.
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </li>
                          </Collapsible>
                        ))}
                        {categorySubjects.length === 0 && (
                          <li className="p-3 text-center text-sm text-muted-foreground">
                            No subjects assigned to you in this category yet.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class Schedule Dialog */}
        <Dialog open={isClassDialogOpen} onOpenChange={(open) => {
          setIsClassDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? 'Edit Class Schedule' : 'Add New Class Schedule'}
              </DialogTitle>
              <DialogDescription>
                {editingSchedule ? 'Update the class schedule details' : 'Create a new class schedule for your subject'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    title="Select subject"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select a subject</option>
                    {subjects?.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="classTitle">Class Title</Label>
                  <Input
                    id="classTitle"
                    type="text"
                    value={classTitle}
                    onChange={(e) => setClassTitle(e.target.value)}
                    placeholder="Enter class title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="classLink">Meeting Link (Optional)</Label>
                  <Input
                    id="classLink"
                    type="url"
                    value={classLink}
                    onChange={(e) => setClassLink(e.target.value)}
                    placeholder="https://meet.google.com/your-meeting-link"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classStartTime">Start Time</Label>
                    <Input
                      id="classStartTime"
                      type="datetime-local"
                      value={classStartTime}
                      onChange={(e) => setClassStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="classEndTime">End Time</Label>
                    <Input
                      id="classEndTime"
                      type="datetime-local"
                      value={classEndTime}
                      onChange={(e) => setClassEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsClassDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClassScheduleMutation.isPending}>
                  {(() => {
                    if (createClassScheduleMutation.isPending) {
                      return editingSchedule ? 'Updating...' : 'Creating...';
                    }
                    return editingSchedule ? 'Update Schedule' : 'Create Schedule';
                  })()}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Teacher Lesson Management Component
  const TeacherResourceManagement = () => {
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<Tables<'resources'> | null>(null);
    
    // Resource form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadType, setUploadType] = useState<'url' | 'file'>('url');
    const [grade, setGrade] = useState(9);

    // Get teacher's subjects only
    const { data: teacherSubjects } = useQuery({
      queryKey: ['teacher-subjects-for-resources'],
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

    // Get resources filtered by teacher's subjects
    const { data: resources, isLoading: isLoadingResources } = useQuery({
      queryKey: ['teacher-resources', selectedSubject],
      queryFn: async () => {
        let query = supabase
          .from('resources')
          .select('*')
          .eq('tenant_id', profile?.tenant_id);

        if (selectedSubject) {
          query = query.eq('subject_id', selectedSubject);
        } else if (teacherSubjects?.length) {
          // Filter to only teacher's subjects
          query = query.in('subject_id', teacherSubjects.map(s => s.id));
        }

        const { data, error } = await query.order('title');
        if (error) throw error;
        return data;
      },
      enabled: !!profile?.tenant_id && !!teacherSubjects,
    });

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

    // Reset form function
    const resetResourceForm = () => {
      setTitle("");
      setDescription("");
      setSubjectId("");
      setFileUrl("");
      setSelectedFile(null);
      setUploadType('url');
      setGrade(9);
      setSelectedResource(null);
    };

    // Create/Update resource mutation
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

        const resourceData = {
          title: data.title,
          description: data.description,
          subject_id: data.subject_id,
          grade: data.grade,
          file_url: finalFileUrl,
          tenant_id: profile.tenant_id,
        };

        if (selectedResource) {
          // Update existing resource
          const { error } = await supabase
            .from('resources')
            .update(resourceData)
            .eq('id', selectedResource.id);
          if (error) throw error;
        } else {
          // Create new resource
          const { error } = await supabase
            .from('resources')
            .insert(resourceData);
          if (error) throw error;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['teacher-resources'] });
        toast.success(selectedResource ? 'Resource updated successfully!' : 'Resource created successfully!');
        resetResourceForm();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
      },
      onError: (error) => {
        toast.error(`Failed to ${selectedResource ? 'update' : 'create'} resource: ${error.message}`);
      },
    });

    // Delete resource mutation
    const deleteResourceMutation = useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from('resources').delete().eq('id', id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['teacher-resources'] });
        toast.success('Resource deleted successfully!');
      },
      onError: (error) => {
        toast.error(`Failed to delete resource: ${error.message}`);
      },
    });

    const handleSubjectChange = (value: string) => {
      setSelectedSubject(value === "all" ? null : value);
    };

    const handleEditClick = (resource: Tables<'resources'>) => {
      setSelectedResource(resource);
      setTitle(resource.title);
      setDescription(resource.description || "");
      setSubjectId(resource.subject_id);
      setGrade(resource.grade);
      setFileUrl(resource.file_url || "");
      setUploadType(resource.file_url?.startsWith('http') ? 'url' : 'file');
      setIsEditDialogOpen(true);
    };

    const handleCreateClick = () => {
      resetResourceForm();
      setIsCreateDialogOpen(true);
    };

    const handleSubmit = () => {
      // Validation
      if (!title.trim()) {
        toast.error('Title is required');
        return;
      }
      if (!subjectId) {
        toast.error('Please select a subject');
        return;
      }
      
      // Check if this is a teacher's subject
      if (!teacherSubjects?.find(s => s.id === subjectId)) {
        toast.error('You can only create resources for your assigned subjects');
        return;
      }

      if (uploadType === 'url' && !fileUrl.trim()) {
        toast.error('Please provide a file URL');
        return;
      }
      if (uploadType === 'file' && !selectedFile && !selectedResource) {
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
    };

    return (
      <div className="space-y-4">
        <div className="flex items-end justify-between mb-4">
          <div className="flex gap-4">
            <div className="w-64">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium">Filter by Subject</span>
                <Select value={selectedSubject || "all"} onValueChange={handleSubjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All My Subjects</SelectItem>
                    {teacherSubjects?.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Resource
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Resources {selectedSubject && teacherSubjects?.find(s => s.id === selectedSubject)?.name && `for ${teacherSubjects.find(s => s.id === selectedSubject)?.name}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingResources ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : resources && resources.length > 0 ? (
              <div className="space-y-2">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(resource.file_url || '')}
                      <div>
                        <div className="font-medium">{resource.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {teacherSubjects?.find(s => s.id === resource.subject_id)?.name} • Grade {resource.grade}
                          {resource.description && ` • ${resource.description}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {resource.file_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={resource.file_url} target="_blank" rel="noopener noreferrer" title="View resource">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(resource)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{resource.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteResourceMutation.mutate(resource.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {selectedSubject ? (
                  <p>No resources found for the selected subject.</p>
                ) : (
                  <p>No resources created yet. Click "Create Resource" to get started.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Resource Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Resource</DialogTitle>
              <DialogDescription>
                Create a new resource for your subjects
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subject" className="text-right">
                  Subject
                </Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherSubjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  resetResourceForm();
                  setIsCreateDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createResourceMutation.isPending}
              >
                {createResourceMutation.isPending ? "Creating..." : "Create Resource"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Resource Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Resource</DialogTitle>
              <DialogDescription>
                Edit the resource details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-title" className="text-right">
                  Title
                </Label>
                <Input 
                  id="edit-title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Input 
                  id="edit-description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-subject" className="text-right">
                  Subject
                </Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherSubjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-grade" className="text-right">
                  Grade
                </Label>
                <Input
                  type="number"
                  id="edit-grade"
                  value={grade.toString()}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-uploadType" className="text-right">
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
                  <Label htmlFor="edit-fileUrl" className="text-right">
                    File URL
                  </Label>
                  <Input 
                    id="edit-fileUrl" 
                    value={fileUrl} 
                    onChange={(e) => setFileUrl(e.target.value)} 
                    className="col-span-3" 
                    placeholder="https://example.com/document.pdf"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-file" className="text-right">
                    Upload File
                  </Label>
                  <div className="col-span-3">
                    <Input 
                      id="edit-file" 
                      type="file" 
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports PDF, Word documents, and images. Leave empty to keep current file.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  resetResourceForm();
                  setIsEditDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createResourceMutation.isPending}
              >
                {createResourceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
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
          <TeacherSubjectManagement />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Management</CardTitle>
              <CardDescription>Create and manage resources for your subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <TeacherResourceManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherDashboard;
