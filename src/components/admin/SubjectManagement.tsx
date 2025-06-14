import { useState } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditSubjectDialog } from "./EditSubjectDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import TopicList from "./TopicList";
import { ChevronsUpDown } from "lucide-react";

type Subject = Tables<'subjects'>;

const subjectFormSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters."),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

const SubjectManagement = () => {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const addForm = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: "" },
  });

  const { mutate: addSubject, isPending: isAdding } = useMutation({
    mutationFn: async (values: SubjectFormValues) => {
      const { error } = await supabase.from('subjects').insert({ name: values.name });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Subject added successfully!" });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      addForm.reset();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to add subject", description: error.message });
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
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to delete subject", description: "This subject might be in use by lessons or resources." });
    },
  });

  const handleEditClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsEditDialogOpen(true);
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
              <form onSubmit={addForm.handleSubmit((d) => addSubject(d))} className="flex items-end gap-2">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel>New Subject Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Life Sciences" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isAdding}>
                  {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Subject
                </Button>
              </form>
            </Form>
            
            <div className="border rounded-md">
              {isLoadingSubjects ? (
                <div className="p-4 text-center">Loading subjects...</div>
              ) : (
                <ul className="divide-y">
                  {subjects?.map((subject) => (
                    <Collapsible asChild key={subject.id}>
                      <li className="list-none">
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 flex-grow text-left">
                               <ChevronsUpDown className="h-4 w-4" />
                               <span className="font-medium">{subject.name}</span>
                            </button>
                           </CollapsibleTrigger>
                          <div className="space-x-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(subject)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
                           <TopicList subjectId={subject.id} />
                         </CollapsibleContent>
                      </li>
                    </Collapsible>
                  ))}
                </ul>
              )}
            </div>
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
