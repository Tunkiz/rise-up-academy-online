
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
import { Loader2, CalendarIcon } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


type Lesson = Tables<'lessons'>;

const videoUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+$/;

const editLessonSchema = z.object({
  title: z.string().min(2, "Lesson title must be at least 2 characters."),
  description: z.string().optional(),
  due_date: z.date().optional().nullable(),
  grade: z.string().optional(),
  content: z.string().optional(),
  pass_mark: z.coerce.number().min(0).max(100).optional().nullable(),
  time_limit: z.coerce.number().min(0).optional().nullable(),
}).superRefine((data, ctx) => {
  // We need the lesson type for validation, but it's not part of the form.
  // We can get it from the lesson prop in the component.
  // For now, this is a basic validation. A more robust solution might involve passing lessonType to superRefine.
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
      due_date: null,
      grade: "all",
      content: "",
      pass_mark: null,
      time_limit: null,
    },
  });

  useEffect(() => {
    if (lesson) {
      form.reset({
        title: lesson.title,
        description: lesson.description || "",
        due_date: lesson.due_date ? new Date(lesson.due_date) : null,
        grade: lesson.grade ? String(lesson.grade) : "all",
        content: lesson.content || "",
        pass_mark: lesson.pass_mark,
        time_limit: lesson.time_limit,
      });
    }
  }, [lesson, form, isOpen]);

  const { mutate: updateLesson, isPending } = useMutation({
    mutationFn: async (values: EditLessonFormValues) => {
      const { title, description, due_date, grade, content, pass_mark, time_limit } = values;
      const { error } = await supabase
        .from('lessons')
        .update({ 
          title, 
          description, 
          due_date: due_date ? due_date.toISOString() : null,
          grade: grade && grade !== 'all' ? parseInt(grade, 10) : null,
          content: ['video', 'notes'].includes(lesson.lesson_type) ? content : undefined,
          pass_mark: lesson.lesson_type === 'quiz' ? pass_mark : undefined,
          time_limit: lesson.lesson_type === 'quiz' ? time_limit : undefined,
        })
        .eq('id', lesson.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Lesson updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['lessons', lesson.topic_id] });
      queryClient.invalidateQueries({ queryKey: ["lesson", lesson.id] });
      queryClient.invalidateQueries({ queryKey: ["lesson_deadlines"] });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="For all grades" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <SelectItem key={g} value={String(g)}>
                          Grade {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {lesson.lesson_type === 'video' && (
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Video URL</FormLabel><FormControl><Input placeholder="e.g., https://www.youtube.com/watch?v=..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            {lesson.lesson_type === 'notes' && (
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder="Enter lesson content here..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            {lesson.lesson_type === 'quiz' && (
              <>
                <FormField control={form.control} name="pass_mark" render={({ field }) => (
                  <FormItem><FormLabel>Pass Mark (%)</FormLabel><FormControl><Input type="number" min="0" max="100" placeholder="e.g., 70" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="time_limit" render={({ field }) => (
                  <FormItem><FormLabel>Time Limit (minutes, optional)</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 30" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
              </>
            )}

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
