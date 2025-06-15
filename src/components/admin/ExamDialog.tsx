
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type Exam = Tables<"exams">;

const examSchema = z.object({
  name: z.string().min(2, "Exam name must be at least 2 characters."),
  description: z.string().optional(),
  registration_start_date: z.date({
    required_error: "Registration start date is required.",
  }),
  registration_end_date: z.date({
    required_error: "Registration end date is required.",
  }),
  exam_date: z.date({
    required_error: "Exam date is required.",
  }),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface ExamDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  exam?: Exam;
}

export const ExamDialog = ({ isOpen, onOpenChange, exam }: ExamDialogProps) => {
  const queryClient = useQueryClient();
  const isEditMode = !!exam;

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (exam && isOpen) {
      form.reset({
        name: exam.name,
        description: exam.description || "",
        registration_start_date: new Date(exam.registration_start_date),
        registration_end_date: new Date(exam.registration_end_date),
        exam_date: new Date(exam.exam_date),
      });
    } else if (!exam && isOpen) {
      form.reset({
        name: "",
        description: "",
        registration_start_date: undefined,
        registration_end_date: undefined,
        exam_date: undefined,
      });
    }
  }, [exam, form, isOpen]);

  const { mutate: upsertExam, isPending } = useMutation({
    mutationFn: async (values: ExamFormValues) => {
      const examData = {
        name: values.name,
        description: values.description,
        registration_start_date: values.registration_start_date.toISOString().split('T')[0],
        registration_end_date: values.registration_end_date.toISOString().split('T')[0],
        exam_date: values.exam_date.toISOString().split('T')[0],
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("exams")
          .update(examData)
          .eq("id", exam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exams").insert(examData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: `Exam ${isEditMode ? "updated" : "created"} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: `Failed to ${isEditMode ? "update" : "create"} exam`,
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ExamFormValues) => {
    upsertExam(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Exam" : "Create Exam"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Change the details of the exam below."
              : "Enter the details for the new exam."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exam Name</FormLabel>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="registration_start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Registration Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
              name="registration_end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Registration End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
              name="exam_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Exam Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Save Changes" : "Create Exam"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
