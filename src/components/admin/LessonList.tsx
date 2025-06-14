
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Edit, Trash2, Video, FileText, CheckSquare, File as FileIcon, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditLessonDialog } from "./EditLessonDialog";

type Lesson = Tables<'lessons'>;

const lessonTypeIcons: { [key: string]: React.ReactNode } = {
  video: <Video className="h-4 w-4 text-blue-500" />,
  notes: <FileText className="h-4 w-4 text-green-500" />,
  quiz: <CheckSquare className="h-4 w-4 text-purple-500" />,
  document: <FileIcon className="h-4 w-4 text-orange-500" />,
};

interface LessonListProps {
  topicId: string;
}

const LessonList = ({ topicId }: LessonListProps) => {
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const { data: lessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ['lessons', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('topic_id', topicId)
        .order('order');
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!topicId,
  });

  const { mutate: deleteLesson, isPending: isDeleting } = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Lesson deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['lessons', topicId] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to delete lesson", description: error.message });
    },
  });

  const handleEditClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsEditDialogOpen(true);
  };

  if (isLoadingLessons) {
    return <div className="p-3 text-sm text-muted-foreground flex items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading lessons...</div>;
  }

  return (
    <>
      <div className="pl-8 pr-2 py-2 bg-muted/25 border-t">
        {lessons && lessons.length > 0 ? (
          <ul className="space-y-1">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="flex items-center justify-between p-2 text-sm rounded-md hover:bg-background">
                <div className="flex items-center gap-2">
                  {lessonTypeIcons[lesson.lesson_type] || <FileIcon className="h-4 w-4" />}
                  <span className="font-medium">{lesson.title}</span>
                </div>
                <div className="space-x-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(lesson)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the lesson and all its content. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteLesson(lesson.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">No lessons found for this topic.</p>
        )}
      </div>
      {selectedLesson && (
        <EditLessonDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          lesson={selectedLesson}
        />
      )}
    </>
  );
};

export default LessonList;
