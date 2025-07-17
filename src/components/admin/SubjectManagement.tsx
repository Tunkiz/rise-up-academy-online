
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditSubjectDialog } from "./EditSubjectDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TopicList from "./TopicList";
import { ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Subject = Tables<'subjects'>;
type SubjectCategory = Tables<'subject_categories'>;

const categoryLabels = {
  'matric_amended': 'Matric Amended Senior Certificate',
  'national_senior': 'National Senior Certificate',
  'senior_phase': 'Senior Phase Certificate'
};

const createSubjectFormSchema = (existingSubjects: Subject[] = [], subjectCategories: SubjectCategory[] = []) => z.object({
  name: z.string()
    .min(2, "Subject name must be at least 2 characters."),
  categories: z.array(z.enum(['matric_amended', 'national_senior', 'senior_phase']))
    .min(1, "Please select at least one category.")
    .refine((categories) => {
      return (name: string) => {
        // Check if the name conflicts with existing subjects in any of the selected categories
        for (const category of categories) {
          const subjectsInCategory = subjectCategories
            .filter(sc => sc.category === category)
            .map(sc => sc.subject_id);
          
          const conflictingSubject = existingSubjects.find(subject => 
            subjectsInCategory.includes(subject.id) &&
            subject.name.toLowerCase() === name.toLowerCase()
          );
          
          if (conflictingSubject) {
            return false;
          }
        }
        return true;
      };
    }, "A subject with this name already exists in one of the selected categories.")
}).refine((data) => {
  // Check if the name conflicts with existing subjects in any of the selected categories
  for (const category of data.categories) {
    const subjectsInCategory = subjectCategories
      .filter(sc => sc.category === category)
      .map(sc => sc.subject_id);
    
    const conflictingSubject = existingSubjects.find(subject => 
      subjectsInCategory.includes(subject.id) &&
      subject.name.toLowerCase() === data.name.toLowerCase()
    );
    
    if (conflictingSubject) {
      return false;
    }
  }
  return true;
}, {
  message: "A subject with this name already exists in one of the selected categories.",
  path: ["name"]
});

type SubjectFormValues = z.infer<ReturnType<typeof createSubjectFormSchema>>;

const SubjectManagement = () => {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Fetch subjects with their categories
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Fetch subject categories
  const { data: subjectCategories } = useQuery({
    queryKey: ['subject-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subject_categories').select('*');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Create dynamic form schema that checks for duplicates per category
  const subjectFormSchema = createSubjectFormSchema(subjects, subjectCategories);

  const addForm = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: "", categories: [] },
  });

  // Update form resolver when subjects or categories change
  useEffect(() => {
    const newSchema = createSubjectFormSchema(subjects, subjectCategories);
    addForm.reset({ name: "", categories: [] });
  }, [subjects, subjectCategories, addForm]);

  const { mutate: addSubject, isPending: isAdding } = useMutation({
    mutationFn: async (values: SubjectFormValues) => {
      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      // Create the subject first
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .insert({ 
          name: values.name,
          tenant_id: profile.tenant_id,
          category: 'national_senior' // Default category, will be overridden by subject_categories
        })
        .select()
        .single();

      if (subjectError) throw new Error(subjectError.message);

      // Set the subject categories using the new function
      const { error: categoriesError } = await supabase.rpc('set_subject_categories', {
        p_subject_id: subject.id,
        p_categories: values.categories
      });

      if (categoriesError) throw new Error(categoriesError.message);
    },
    onSuccess: () => {
      toast({ title: "Subject added successfully!" });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
      addForm.reset();
    },
    onError: (error) => {
      let errorMessage = error.message;
      let errorTitle = "Failed to add subject";
      
      // Handle specific error cases
      if (error.message.includes('already exists in category')) {
        errorTitle = "Subject name conflict";
        errorMessage = error.message; // Use the specific category error message from server
      } else if (error.message.includes('duplicate key value violates unique constraint')) {
        errorTitle = "Subject name conflict";
        errorMessage = "A subject with this name already exists in one of the selected categories.";
      } else if (error.message.includes('duplicate')) {
        errorTitle = "Duplicate subject";
        errorMessage = "A subject with this name already exists in one of the selected categories.";
      }
      
      toast({ 
        variant: "destructive", 
        title: errorTitle, 
        description: errorMessage 
      });
    },
  });

  const { mutate: deleteSubject } = useMutation({
    mutationFn: async (subjectId: string) => {
      const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Subject deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to delete subject", description: "This subject might be in use by lessons or resources." });
    },
  });

  const handleEditClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsEditDialogOpen(true);
  };

  // Helper function to get categories for a subject
  const getSubjectCategories = (subjectId: string) => {
    return subjectCategories?.filter(sc => sc.subject_id === subjectId).map(sc => sc.category) || [];
  };

  // Group subjects by their categories (a subject can appear in multiple groups)
  const groupedSubjects = () => {
    const groups: Record<string, { subject: Subject; categories: string[] }[]> = {};
    
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage Subjects</CardTitle>
          <CardDescription>Add, edit, or remove subjects from the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit((d) => addSubject(d))} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Life Sciences" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="categories"
                    render={() => (
                      <FormItem>
                        <FormLabel>Categories</FormLabel>
                        <div className="space-y-2">
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <FormField
                              key={value}
                              control={addForm.control}
                              name="categories"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(value as 'matric_amended' | 'national_senior' | 'senior_phase')}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (val) => val !== value
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                      {label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={isAdding} className="w-full sm:w-auto">
                  {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Subject
                </Button>
              </form>
            </Form>
            
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
                                <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(subject)} className="h-8 w-8 p-0 sm:h-10 sm:w-10">
                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="sr-only">Edit {subject.name}</span>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:h-10 sm:w-10">
                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                                        <span className="sr-only">Delete {subject.name}</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete the subject and all its topics. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteSubject(subject.id)} className="bg-destructive hover:bg-destructive/90">
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              <CollapsibleContent>
                                <div className="p-4 text-muted-foreground text-sm">
                                  Topic and lesson management has been moved to dedicated sections.
                                </div>
                              </CollapsibleContent>
                            </li>
                          </Collapsible>
                        ))}
                        {categorySubjects.length === 0 && (
                          <li className="p-3 text-center text-sm text-muted-foreground">
                            No subjects in this category yet.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {selectedSubject && (
        <EditSubjectDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          subject={selectedSubject}
        />
      )}
    </>
  );
};

export default SubjectManagement;
