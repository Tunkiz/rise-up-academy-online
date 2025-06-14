
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditTopicDialog } from "./EditTopicDialog";

type Topic = Tables<'topics'>;

const topicFormSchema = z.object({
  name: z.string().min(2, "Topic name must be at least 2 characters."),
});

type TopicFormValues = z.infer<typeof topicFormSchema>;

interface TopicListProps {
  subjectId: string;
}

const TopicList = ({ subjectId }: TopicListProps) => {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const { data: topics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ['topics', subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('*').eq('subject_id', subjectId).order('name');
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!subjectId,
  });

  const addForm = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: { name: "" },
  });

  const { mutate: addTopic, isPending: isAdding } = useMutation({
    mutationFn: async (values: TopicFormValues) => {
      const { error } = await supabase.from('topics').insert({ name: values.name, subject_id: subjectId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Topic added successfully!" });
      queryClient.invalidateQueries({ queryKey: ['topics', subjectId] });
      addForm.reset();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to add topic", description: error.message });
    },
  });

  const { mutate: deleteTopic } = useMutation({
    mutationFn: async (topicId: string) => {
      const { error } = await supabase.from('topics').delete().eq('id', topicId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Topic deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['topics', subjectId] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to delete topic", description: "This topic might be in use by lessons." });
    },
  });

  const handleEditClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div className="p-4 bg-muted/50 border-t space-y-4">
        <h4 className="font-semibold text-sm">Topics</h4>
        {isLoadingTopics ? (
          <div className="text-center text-sm text-muted-foreground">Loading topics...</div>
        ) : (
          <ul className="divide-y border rounded-md bg-background">
            {topics?.map((topic) => (
              <li key={topic.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                <span className="text-sm">{topic.name}</span>
                <div className="space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(topic)}>
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
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the topic and all its associated lessons. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTopic(topic.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
             {topics?.length === 0 && <li className="p-3 text-center text-sm text-muted-foreground">No topics found for this subject.</li>}
          </ul>
        )}
        <Form {...addForm}>
          <form onSubmit={addForm.handleSubmit((d) => addTopic(d))} className="flex items-end gap-2">
            <FormField
              control={addForm.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormLabel className="text-xs">New Topic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Algebra" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isAdding} size="sm">
              {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Topic
            </Button>
          </form>
        </Form>
      </div>
      {selectedTopic && (
        <EditTopicDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          topic={selectedTopic}
        />
      )}
    </>
  );
};

export default TopicList;
