
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

type Topic = Tables<'topics'>;

const editTopicSchema = z.object({
  name: z.string().min(2, "Topic name must be at least 2 characters."),
});

type EditTopicFormValues = z.infer<typeof editTopicSchema>;

interface EditTopicDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  topic: Topic;
}

export const EditTopicDialog = ({ isOpen, onOpenChange, topic }: EditTopicDialogProps) => {
  const queryClient = useQueryClient();
  
  const form = useForm<EditTopicFormValues>({
    resolver: zodResolver(editTopicSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (topic) {
      form.reset({ name: topic.name });
    }
  }, [topic, form, isOpen]);

  const { mutate: updateTopic, isPending } = useMutation({
    mutationFn: async (values: EditTopicFormValues) => {
      const { error } = await supabase
        .from('topics')
        .update({ name: values.name })
        .eq('id', topic.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Topic updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['topics', topic.subject_id] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to update topic", description: error.message });
    },
  });

  const onSubmit = (data: EditTopicFormValues) => {
    updateTopic(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
          <DialogDescription>Change the name of the topic below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
