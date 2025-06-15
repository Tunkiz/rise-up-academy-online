
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";

type Subject = Tables<'subjects'>;

const editSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters."),
  class_time: z.string().optional(),
  teams_link: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')).optional(),
});

type EditSubjectFormValues = z.infer<typeof editSubjectSchema>;

interface EditSubjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  subject: Subject;
}

export const EditSubjectDialog = ({ isOpen, onOpenChange, subject }: EditSubjectDialogProps) => {
  const queryClient = useQueryClient();
  
  const form = useForm<EditSubjectFormValues>({
    resolver: zodResolver(editSubjectSchema),
    defaultValues: {
      name: "",
      class_time: "",
      teams_link: "",
    },
  });

  useEffect(() => {
    if (subject) {
      form.reset({
        name: subject.name,
        class_time: subject.class_time || "",
        teams_link: subject.teams_link || "",
      });
    }
  }, [subject, form, isOpen]);

  const { mutate: updateSubject, isPending } = useMutation({
    mutationFn: async (values: EditSubjectFormValues) => {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: values.name,
          class_time: values.class_time || null,
          teams_link: values.teams_link || null,
        })
        .eq('id', subject.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Subject updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to update subject", description: error.message });
    },
  });

  const onSubmit = (data: EditSubjectFormValues) => {
    updateSubject(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
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
