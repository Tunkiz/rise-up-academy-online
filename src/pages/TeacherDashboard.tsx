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
import { Checkbox } from "@/components/ui/checkbox";
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
  LinkIcon
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
import LessonManagement from "@/components/admin/LessonManagement";

// Helper function to generate recurring schedules
const generateRecurringSchedules = (
  startDate: string, 
  type: 'weekly' | 'monthly' | 'custom', 
  interval: number, 
  endDate: string
): string[] => {
  const schedules: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  
  while (current <= end) {
    schedules.push(current.toISOString());
    
    // Calculate next occurrence
    switch (type) {
      case 'weekly':
        current.setDate(current.getDate() + (7 * interval));
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + interval);
        break;
      case 'custom':
        current.setDate(current.getDate() + interval);
        break;
    }
  }
  
  return schedules;
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Class scheduling state
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [classLink, setClassLink] = useState("");
  const [classDate, setClassDate] = useState("");
  const [classTime, setClassTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndDate, setRecurringEndDate] = useState("");
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
    setClassDate("");
    setClassTime("");
    setIsRecurring(false);
    setRecurringType('weekly');
    setRecurringInterval(1);
    setRecurringEndDate("");
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
        .order('scheduled_at', { ascending: false });
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
      class_link: string;
      scheduled_at: string;
      is_recurring?: boolean;
      recurring_type?: 'weekly' | 'monthly' | 'custom';
      recurring_interval?: number;
      recurring_end_date?: string;
    }) => {
      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      if (editingSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('class_schedules')
          .update({
            subject_id: data.subject_id,
            class_link: data.class_link,
            scheduled_at: data.scheduled_at,
            is_recurring: data.is_recurring || false,
            recurring_type: data.recurring_type || null,
            recurring_interval: data.recurring_interval || null,
            recurring_end_date: data.recurring_end_date || null,
          })
          .eq('id', editingSchedule.id);
        if (error) throw error;
      } else {
        // Create new schedule(s)
        if (data.is_recurring && data.recurring_end_date) {
          // Generate recurring schedules
          const schedules = generateRecurringSchedules(
            data.scheduled_at,
            data.recurring_type || 'weekly',
            data.recurring_interval || 1,
            data.recurring_end_date
          );

          const schedulesToInsert = schedules.map(scheduledAt => ({
            subject_id: data.subject_id,
            class_link: data.class_link,
            scheduled_at: scheduledAt,
            is_recurring: true,
            recurring_type: data.recurring_type,
            recurring_interval: data.recurring_interval,
            recurring_end_date: data.recurring_end_date,
            tenant_id: profile.tenant_id,
          }));

          const { error } = await supabase
            .from('class_schedules')
            .insert(schedulesToInsert);
          if (error) throw error;
        } else {
          // Create single schedule
          const { error } = await supabase
            .from('class_schedules')
            .insert({
              subject_id: data.subject_id,
              class_link: data.class_link,
              scheduled_at: data.scheduled_at,
              is_recurring: data.is_recurring || false,
              recurring_type: data.recurring_type || null,
              recurring_interval: data.recurring_interval || null,
              recurring_end_date: data.recurring_end_date || null,
              tenant_id: profile.tenant_id,
            });
          if (error) throw error;
        }
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
    if (!selectedSubject || !classLink || !classDate || !classTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isRecurring && !recurringEndDate) {
      toast.error('Please select an end date for recurring classes');
      return;
    }

    const scheduledAt = new Date(`${classDate}T${classTime}`).toISOString();
    createClassScheduleMutation.mutate({
      subject_id: selectedSubject,
      class_link: classLink,
      scheduled_at: scheduledAt,
      is_recurring: isRecurring,
      recurring_type: isRecurring ? recurringType : undefined,
      recurring_interval: isRecurring ? recurringInterval : undefined,
      recurring_end_date: isRecurring ? recurringEndDate : undefined,
    });
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: Tables<'class_schedules'>) => {
    setEditingSchedule(schedule);
    setSelectedSubject(schedule.subject_id);
    setClassLink(schedule.class_link);
    const date = new Date(schedule.scheduled_at);
    setClassDate(date.toISOString().split('T')[0]);
    setClassTime(date.toTimeString().substring(0, 5));
    setIsRecurring(schedule.is_recurring || false);
    setRecurringType(schedule.recurring_type || 'weekly');
    setRecurringInterval(schedule.recurring_interval || 1);
    setRecurringEndDate(schedule.recurring_end_date || '');
    setIsClassDialogOpen(true);
  };

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
                                                  <span className="text-sm">
                                                    {format(new Date(schedule.scheduled_at), 'PPP p')}
                                                  </span>
                                                  {schedule.is_recurring && (
                                                    <div className="text-xs text-muted-foreground">
                                                      Recurring {schedule.recurring_type} 
                                                      {schedule.recurring_interval && schedule.recurring_interval > 1 && ` (every ${schedule.recurring_interval} ${schedule.recurring_type === 'weekly' ? 'weeks' : schedule.recurring_type === 'monthly' ? 'months' : 'days'})`}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 p-0"
                                                  onClick={() => window.open(schedule.class_link, '_blank')}
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
                  <Label htmlFor="classLink">Class Link</Label>
                  <Input
                    id="classLink"
                    type="url"
                    value={classLink}
                    onChange={(e) => setClassLink(e.target.value)}
                    placeholder="https://meet.google.com/your-meeting-link"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classDate">Date</Label>
                    <Input
                      id="classDate"
                      type="date"
                      value={classDate}
                      onChange={(e) => setClassDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="classTime">Time</Label>
                    <Input
                      id="classTime"
                      type="time"
                      value={classTime}
                      onChange={(e) => setClassTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                {/* Recurring Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRecurring"
                      checked={isRecurring}
                      onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                    />
                    <Label htmlFor="isRecurring">Make this a recurring class</Label>
                  </div>
                  
                  {isRecurring && (
                    <div className="grid gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="recurringType">Repeat</Label>
                          <Select value={recurringType} onValueChange={(value: 'weekly' | 'monthly' | 'custom') => setRecurringType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="custom">Custom (days)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="recurringInterval">
                            Every {recurringType === 'weekly' ? 'week(s)' : recurringType === 'monthly' ? 'month(s)' : 'day(s)'}
                          </Label>
                          <Input
                            id="recurringInterval"
                            type="number"
                            min="1"
                            value={recurringInterval}
                            onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="recurringEndDate">End Date</Label>
                        <Input
                          id="recurringEndDate"
                          type="date"
                          value={recurringEndDate}
                          onChange={(e) => setRecurringEndDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
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
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default TeacherDashboard;
