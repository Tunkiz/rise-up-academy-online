
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/integrations/supabase/types";
import Quiz from "@/components/learning/Quiz";
import VideoPlayer from "@/components/learning/VideoPlayer";
import { format } from "date-fns";

type Lesson = Tables<"lessons">;

const LessonPage = () => {
  const { subjectId, topicId, lessonId } = useParams<{ subjectId: string; topicId: string; lessonId: string }>();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async (): Promise<Lesson | null> => {
      if (!lessonId) return null;
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      if (error) {
        console.error("Error fetching lesson:", error);
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!lessonId,
  });

  return (
    <div className="container py-10">
      <Link to={`/subject/${subjectId}/topic/${topicId}`} className="mb-6 inline-block">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lessons
        </Button>
      </Link>
      
      {isLoading ? (
        <>
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full" />
        </>
      ) : (
        lesson && (
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{lesson.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.due_date && (
                <div className="mb-4 flex items-center text-sm font-semibold text-destructive">
                  <Clock className="mr-2 h-4 w-4" />
                  Due: {format(new Date(lesson.due_date), 'PPP p')}
                </div>
              )}
              <p className="text-muted-foreground mb-4">Lesson Type: {lesson.lesson_type}</p>
              <div className="prose dark:prose-invert max-w-none">
                {lesson.lesson_type === 'quiz' ? (
                  <Quiz lessonId={lesson.id} passMark={lesson.pass_mark} />
                ) : lesson.content ? (
                  lesson.lesson_type === 'video' ? (
                    <VideoPlayer url={lesson.content} title={lesson.title} />
                  ) : (
                    <p>{lesson.content}</p>
                  )
                ) : (
                  <p className="text-muted-foreground">No content available for this lesson yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      )}
       {!isLoading && !lesson && (
        <p className="text-muted-foreground text-center py-4">
          Lesson not found.
        </p>
      )}
    </div>
  );
};

export default LessonPage;
