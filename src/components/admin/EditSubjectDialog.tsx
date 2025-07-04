
import { useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useSubjectCategories } from "@/hooks/useSubjectCategories";

type Subject = Tables<'subjects'>;
type SubjectCategory = Tables<'subject_categories'>;

const categoryLabels = {
  'matric_amended': 'Matric Amended Senior Certificate',
  'national_senior': 'National Senior Certificate',
  'senior_phase': 'Senior Phase Certificate'
};

const createEditSubjectSchema = (existingSubjects: Subject[] = [], subjectCategories: SubjectCategory[] = [], currentSubjectId?: string) => z.object({
  name: z.string()
    .min(2, "Subject name must be at least 2 characters."),
  categories: z.array(z.enum(['matric_amended', 'national_senior', 'senior_phase']))
    .min(1, "Please select at least one category."),
  class_time: z.string().optional(),
  teams_link: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional(),
}).refine((data) => {
  // Check if the name conflicts with existing subjects in any of the selected categories
  for (const category of data.categories) {
    const subjectsInCategory = subjectCategories
      .filter(sc => sc.category === category)
      .map(sc => sc.subject_id);
    
    const conflictingSubject = existingSubjects.find(subject => 
      subjectsInCategory.includes(subject.id) &&
      subject.id !== currentSubjectId &&
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

type EditSubjectFormValues = z.infer<ReturnType<typeof createEditSubjectSchema>>;

interface EditSubjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subject: Subject;
}

export const EditSubjectDialog = ({ isOpen, onOpenChange, subject }: EditSubjectDialogProps) => {
  const queryClient = useQueryClient();
  const { categories: currentCategories } = useSubjectCategories(subject?.id);

  // Get all subjects for duplicate name validation
  const { data: allSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Get subject categories for validation
  const { data: subjectCategories } = useQuery({
    queryKey: ['subject-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subject_categories').select('*');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  // Create dynamic schema for validation
  const editSubjectSchema = createEditSubjectSchema(allSubjects, subjectCategories, subject?.id);
  
  const form = useForm<EditSubjectFormValues>({
    resolver: zodResolver(editSubjectSchema),
    defaultValues: {
      name: "",
      categories: [],
      class_time: "",
      teams_link: "",
    },
  });

  useEffect(() => {
    if (subject && currentCategories && allSubjects && subjectCategories) {
      // Update schema when data changes
      const newSchema = createEditSubjectSchema(allSubjects, subjectCategories, subject.id);
      form.reset({
        name: subject.name,
        categories: currentCategories,
        class_time: subject.class_time || "",
        teams_link: subject.teams_link || "",
      });
    }
  }, [subject, currentCategories, allSubjects, subjectCategories, form, isOpen]);

  const { mutate: updateSubject, isPending } = useMutation({
    mutationFn: async (values: EditSubjectFormValues) => {
      // Update subject basic info
      const { error } = await supabase
        .from('subjects')
        .update({
          name: values.name,
          class_time: values.class_time || null,
          teams_link: values.teams_link || null,
        })
        .eq('id', subject.id);
      if (error) throw new Error(error.message);

      // Update categories using the RPC function
      const { error: categoriesError } = await supabase.rpc('set_subject_categories', {
        p_subject_id: subject.id,
        p_categories: values.categories
      });
      if (categoriesError) throw new Error(categoriesError.message);
    },
    onSuccess: () => {
      toast({ title: "Subject updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
      onOpenChange(false);
    },
    onError: (error) => {
      let errorMessage = error.message;
      let errorTitle = "Failed to update subject";
      
      // Handle specific error cases
      if (error.message.includes('already exists in category')) {
        errorTitle = "Subject name conflict";
        errorMessage = error.message; // Use the specific category error message from server
      } else if (error.message.includes('duplicate key value violates unique constraint')) {
        errorTitle = "Subject name conflict";
        errorMessage = "A subject with this name already exists in one of the selected categories.";
      } else if (error.message.includes('duplicate')) {
        errorTitle = "Duplicate subject name";
        errorMessage = "A subject with this name already exists in one of the selected categories.";
      }
      
      toast({ 
        variant: "destructive", 
        title: errorTitle, 
        description: errorMessage 
      });
    },
  });

  const onSubmit = (data: EditSubjectFormValues) => {
    updateSubject(data);
  };

  const createCheckboxHandler = (field: { value: string[]; onChange: (value: string[]) => void }, value: string) => {
    const addCategory = () => field.onChange([...field.value, value]);
    const removeCategory = () => field.onChange(field.value?.filter((val: string) => val !== value));
    
    return (checked: boolean) => checked ? addCategory() : removeCategory();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>Change the details of the subject below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categories"
              render={() => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <div className="space-y-3">
                    {Object.entries(categoryLabels).map(([value, label]) => {
                      return (
                        <FormField
                          key={value}
                          control={form.control}
                          name="categories"
                          render={({ field }) => {
                            const isChecked = field.value?.includes(value as 'matric_amended' | 'national_senior' | 'senior_phase');
                            
                            return (
                              <FormItem
                                key={value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={createCheckboxHandler(field, value)}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="class_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Time</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tuesdays at 4:00 PM" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="teams_link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teams Meeting Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://teams.microsoft.com/..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
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
