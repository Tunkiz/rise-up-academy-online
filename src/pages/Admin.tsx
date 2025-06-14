import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Upload, PlusCircle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateLessonForm } from "@/components/admin/CreateLessonForm";
import UserManagementTable from "@/components/admin/UserManagementTable";
import SubjectManagement from "@/components/admin/SubjectManagement";
import { Users } from "lucide-react";

const resourceFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  subject_id: z.string().uuid("Please select a subject."),
  file: z.instanceof(File).refine(file => file.size > 0, "A file is required."),
});

type ResourceFormValues = z.infer<typeof resourceFormSchema>;
type Subject = Tables<'subjects'>;

const AdminPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "You must be an admin to view this page." });
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, navigate]);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
  });

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { mutate: uploadResource, isPending } = useMutation({
    mutationFn: async (values: ResourceFormValues) => {
      const file = values.file;
      const filePath = `public/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('resource_files').upload(filePath, file);
      if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('resource_files').getPublicUrl(filePath);
      if (!publicUrl) throw new Error("Could not get public URL for the file.");

      const { error: insertError } = await supabase.from('resources').insert({
        title: values.title,
        description: values.description,
        subject_id: values.subject_id,
        file_url: publicUrl,
      });
      if (insertError) throw new Error(`Failed to save resource: ${insertError.message}`);
    },
    onSuccess: () => {
      toast({ title: "Resource uploaded successfully!" });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      form.reset();
      // Also reset file input visually
      const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    },
  });

  const onSubmit = (values: ResourceFormValues) => {
    uploadResource(values);
  };
  
  if (authLoading || !isAdmin) {
    return (
      <div className="container py-10">
        <div className="flex flex-col space-y-3">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold">Admin Panel</h1>
      <p className="text-muted-foreground mt-2">Manage application content here.</p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create New Lesson</CardTitle>
            <CardDescription>Add a new quiz, video, notes, or document lesson.</CardDescription>
          </CardHeader>
          <CardContent>
             <Dialog open={isCreateLessonOpen} onOpenChange={setIsCreateLessonOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Lesson</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to add a new lesson.
                  </DialogDescription>
                </DialogHeader>
                <CreateLessonForm 
                  subjects={subjects} 
                  isLoadingSubjects={isLoadingSubjects} 
                  onLessonCreated={() => setIsCreateLessonOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upload New Resource</CardTitle>
            <CardDescription>Add a new study material to the Resource Library.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Algebra Cheatsheet" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief summary of the resource." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="subject_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingSubjects}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select a subject"} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects?.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="file" render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Resource File</FormLabel>
                    <FormControl>
                      <Input id="file-input" type="file" {...fieldProps} onChange={(e) => onChange(e.target.files?.[0])} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Resource
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <SubjectManagement />
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>View, search, and manage user accounts.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <UserManagementTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
