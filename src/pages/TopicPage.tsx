
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Book, BookOpen, BookText, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Topic = Tables<"topics">;
type Lesson = Tables<"lessons">;
type LessonCompletionInsert = Tables<"lesson_completions", "Insert">;

const LessonIcon = ({
  type,
  className,
}: {
  type: string;
  className?: string;
}) => {
  switch (type) {
    case "video":
      return <Video className={className} />;
    case "notes":
      return <BookOpen className={className} />;
    case "quiz":
      return <BookText className={className} />;
    default:
      return <Book className={className} />;
  }
};

const TopicPage = () => {
  const { subjectId, topicId } = useParams<{ subjectId: string; topicId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: topic, isLoading: isLoadingTopic } = useQuery({
    queryKey: ["topic", topicId],
    queryFn: async (): Promise<Topic | null> => {
      if (!topicId) return null;
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("id", topicId)
        .single();
      if (error) {
        console.error("Error fetching topic:", error);
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!topicId,
  });

  const { data: lessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ["lessons", topicId],
    queryFn: async (): Promise<Lesson[]> => {
      if (!topicId) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("topic_id", topicId)
        .order("order", { ascending: true });
      if (error) {
        console.error("Error fetching lessons:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!topicId,
  });
  
  const lessonIds = lessons?.map((l) => l.id);

  const { data: lessonCompletions, isLoading: isLoadingCompletions } = useQuery({
    queryKey: ["lesson_completions", user?.id, topicId],
    queryFn: async (): Promise<Pick<LessonCompletionInsert, "lesson_id">[]> => {
      if (!user || !lessonIds || lessonIds.length === 0) return [];
      const { data, error } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds);
      if (error) {
        console.error("Error fetching lesson completions:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!user && !!lessonIds && lessonIds.length > 0,
  });
  
  const completedLessonIds = new Set(lessonCompletions?.map((lc) => lc.lesson_id));

  const toggleLessonMutation = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      if (completed) {
        const { error } = await supabase.from("lesson_completions").insert({
          user_id: user.id,
          lesson_id: lessonId,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lesson_completions")
          .delete()
          .match({ user_id: user.id, lesson_id: lessonId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson_completions", user?.id, topicId] });
      queryClient.invalidateQueries({ queryKey: ["topics", subjectId] });
      toast({
        title: "Progress updated!",
        description: "Your lesson completion status has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update progress: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const isLoading = isLoadingTopic || isLoadingLessons || (!!user && isLoadingCompletions);

  return (
    <div className="container py-10">
      <Link to={`/subject/${subjectId}`} className="mb-6 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topics
        </Button>
      </Link>
      
      {isLoadingTopic ? (
        <Skeleton className="h-10 w-3/4 mb-2" />
      ) : (
        topic && <h1 className="text-4xl font-bold">{topic.name}</h1>
      )}
      <p className="text-muted-foreground mt-2">
        Complete the lessons below to make progress.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-5 w-4/5" />
                <div className="ml-auto">
                  <Skeleton className="h-5 w-5" />
                </div>
              </div>
            ))}
            {!isLoading && lessons?.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center space-x-4 p-4 border rounded-md"
              >
                <LessonIcon type={lesson.lesson_type} className="h-5 w-5 text-muted-foreground" />
                <span className="flex-grow">{lesson.title}</span>
                <Checkbox
                  id={`lesson-${lesson.id}`}
                  checked={completedLessonIds.has(lesson.id)}
                  onCheckedChange={(checked) => {
                    toggleLessonMutation.mutate({
                      lessonId: lesson.id,
                      completed: !!checked,
                    });
                  }}
                  disabled={!user || toggleLessonMutation.isPending}
                />
              </div>
            ))}
            {!isLoading && (!lessons || lessons.length === 0) && (
              <p className="text-muted-foreground text-center py-4">
                No lessons found for this topic yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TopicPage;
