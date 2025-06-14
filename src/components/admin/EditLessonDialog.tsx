
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
import { Textarea } from "../ui/textarea";

type Lesson = Tables<'lessons'>;

const editLessonSchema = z.object({
  title: z.string().min(2, "Lesson title must be at least 2 characters."),
  description: z.string().optional(),
});

type EditLessonFormValues = z.infer<typeof editLessonSchema>;

interface EditLessonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  lesson: Lesson;
}

export const EditLessonDialog = ({ isOpen, onOpenChange, lesson }: EditLessonDialogProps) => {
  const queryClient = useQueryClient();
  
  const form = useForm<EditLessonFormValues>({
    resolver: zodResolver(editLessonSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (lesson) {
      form.reset({ title: lesson.title, description: lesson.description || "" });
    }
  }, [lesson, form, isOpen]);

  const { mutate: updateLesson, isPending } = useMutation({
    mutationFn: async (values: EditLessonFormValues) => {
      const { error } = await supabase
        .from('lessons')
        .update({ title: values.title, description: values.description })
        .eq('id', lesson.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Lesson updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['lessons', lesson.topic_id] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to update lesson", description: error.message });
    },
  });

  const onSubmit = (data: EditLessonFormValues) => {
    updateLesson(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Lesson</DialogTitle>
          <DialogDescription>Change the details of the lesson below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief summary of the lesson." {...field} />
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
