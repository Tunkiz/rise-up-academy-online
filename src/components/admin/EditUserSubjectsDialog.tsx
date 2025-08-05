
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';

type User = Database['public']['Functions']['get_user_details']['Returns'][number];
type Subject = Tables<'subjects'>;

// Category display names
const categoryDisplayNames: Record<string, string> = {
  matric_amended: 'Matric Amended',
  national_senior: 'National Senior Certificate',
  senior_phase: 'Senior Phase'
};

// Group subjects by category using subject_categories table
const groupSubjectsByCategory = (subjects: Subject[], subjectCategories: any[]) => {
  const groups: Record<string, Subject[]> = {};
  
  subjects.forEach(subject => {
    const categories = subjectCategories
      ?.filter(sc => sc.subject_id === subject.id)
      .map(sc => sc.category) || [];
      
    if (categories.length === 0) {
      // Handle subjects without categories
      if (!groups['uncategorized']) groups['uncategorized'] = [];
      groups['uncategorized'].push(subject);
    } else {
      categories.forEach(category => {
        if (!groups[category]) groups[category] = [];
        groups[category].push(subject);
      });
    }
  });
  
  return groups;
};

const editSubjectsSchema = z.object({
  subject_ids: z.array(z.string().uuid()),
});

type FormValues = z.infer<typeof editSubjectsSchema>;

interface EditUserSubjectsDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const EditUserSubjectsDialog: React.FC<EditUserSubjectsDialogProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const [openCategories, setOpenCategories] = React.useState<Set<string>>(new Set());
  
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(editSubjectsSchema),
    defaultValues: {
      subject_ids: [],
    },
  });

  const { data: allSubjects, isLoading: isLoadingSubjects, error: subjectsError } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  // Get subject categories
  const { data: subjectCategories } = useQuery({
    queryKey: ['subject-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subject_categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Group subjects by category
  const groupedSubjects = React.useMemo(() => {
    return groupSubjectsByCategory(allSubjects || [], subjectCategories || []);
  }, [allSubjects, subjectCategories]);

  // Get currently enrolled categories
  const enrolledCategories = React.useMemo(() => {
    if (!user?.subjects || !Array.isArray(user.subjects)) return new Set<string>();
    const userSubjectIds = new Set((user.subjects as Subject[]).map(s => s.id));
    const categories = new Set<string>();
    
    Object.entries(groupedSubjects).forEach(([category, subjects]) => {
      if (subjects.some(subject => userSubjectIds.has(subject.id))) {
        categories.add(category);
      }
    });
    
    return categories;
  }, [user?.subjects, groupedSubjects]);

  // Filter to show only enrolled categories, or all categories if no enrollment
  const filteredGroupedSubjects = React.useMemo(() => {
    if (enrolledCategories.size === 0) {
      // If no enrollment, show all categories
      return groupedSubjects;
    }
    
    // If enrolled, show only enrolled categories
    const filtered: Record<string, Subject[]> = {};
    enrolledCategories.forEach(category => {
      if (groupedSubjects[category]) {
        filtered[category] = groupedSubjects[category];
      }
    });
    return filtered;
  }, [groupedSubjects, enrolledCategories]);

  // Initialize open categories
  React.useEffect(() => {
    setOpenCategories(enrolledCategories);
  }, [enrolledCategories]);

  React.useEffect(() => {
    if (user?.subjects) {
      const userSubjectIds = (user.subjects as Subject[]).map(s => s.id);
      form.reset({ subject_ids: userSubjectIds });
    }
  }, [user, form]);
  
  const { mutate: updateUserSubjects, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user) return;
      const { error } = await supabase.rpc('update_user_subjects_by_admin', {
        target_user_id: user.id,
        new_subject_ids: values.subject_ids,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: 'User subjects updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user-details', user.id] });
      }
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update subjects',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateUserSubjects(data);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Subjects for {user.full_name || user.email}</DialogTitle>
          <DialogDescription>
            Select the subjects this user is enrolled in. {enrolledCategories.size > 0 
              ? `Showing subjects from the ${Array.from(enrolledCategories).map(cat => categoryDisplayNames[cat] || cat).join(', ')} category.`
              : 'This student can be enrolled in subjects from any category.'
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Available Subjects</FormLabel>
                  {enrolledCategories.size > 0 && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded mb-2">
                      <strong>Category:</strong> {Array.from(enrolledCategories).map(cat => categoryDisplayNames[cat] || cat).join(', ')}
                    </div>
                  )}
                  <div className="space-y-3 max-h-80 overflow-y-auto p-2 border rounded-md">
                    {isLoadingSubjects ? (
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ) : subjectsError ? (
                      <div className="text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Error loading subjects.</span>
                      </div>
                    ) : (
                      Object.entries(filteredGroupedSubjects).map(([category, subjects]) => {
                        const isOpen = openCategories.has(category);
                        const currentSubjectIds = form.watch('subject_ids') || [];
                        
                        return (
                          <div key={category} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={() => toggleCategory(category)}
                                className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                              >
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {categoryDisplayNames[category] || category}
                              </button>
                              <Badge variant="default" className="text-xs">
                                {subjects.filter(s => currentSubjectIds.includes(s.id)).length} selected
                              </Badge>
                            </div>
                            
                            {isOpen && (
                              <div className="grid grid-cols-1 gap-2 ml-4">
                                {subjects.map((subject) => (
                                  <FormField
                                    key={subject.id}
                                    control={form.control}
                                    name="subject_ids"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(subject.id)}
                                            onCheckedChange={(checked) => {
                                              if (checked) {
                                                field.onChange([...(field.value || []), subject.id]);
                                              } else {
                                                field.onChange(
                                                  field.value?.filter(value => value !== subject.id)
                                                );
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          {subject.name}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending || isLoadingSubjects}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
