
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthProvider";
import type { Tables } from "@/integrations/supabase/types";

type Topic = Tables<"topics"> & { progress?: number };
type Subject = Tables<"subjects">;
type Lesson = Tables<"lessons">;
type LessonCompletion = Tables<"lesson_completions">;

const SubjectDashboard = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { user } = useAuth();

  const { data: subject, isLoading: isLoadingSubject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async (): Promise<Subject | null> => {
      if (!subjectId) return null;
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!subjectId,
  });

  const { data: topics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: async (): Promise<Topic[]> => {
      if (!subjectId) return [];
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("subject_id", subjectId);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!subjectId,
  });

  const topicIds = topics?.map((t) => t.id);

  const { data: lessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ["lessons", topicIds],
    queryFn: async (): Promise<Lesson[]> => {
      if (!topicIds || topicIds.length === 0) return [];
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .in("topic_id", topicIds);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!topicIds && topicIds.length > 0,
  });

  const {
    data: lessonCompletions,
    isLoading: isLoadingLessonCompletions,
  } = useQuery({
    queryKey: ["lesson_completions", user?.id, topicIds],
    queryFn: async (): Promise<Pick<LessonCompletion, "lesson_id">[]> => {
      if (!user || !topicIds || topicIds.length === 0) return [];
      const lessonIds = lessons?.map((l) => l.id) || [];
      if (lessonIds.length === 0) return [];

      const { data, error } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user && !!topicIds && topicIds.length > 0 && !!lessons,
  });

  const isLoading =
    isLoadingSubject ||
    isLoadingTopics ||
    isLoadingLessons ||
    (!!user && isLoadingLessonCompletions);

  const topicsWithProgress = topics?.map((topic) => {
    const topicLessons = lessons?.filter((l) => l.topic_id === topic.id) || [];
    const totalLessons = topicLessons.length;

    if (totalLessons === 0) {
      return { ...topic, progress: 0 };
    }

    const completedLessonIds = new Set(
      lessonCompletions?.map((lc) => lc.lesson_id)
    );
    const completedTopicLessons = topicLessons.filter((l) =>
      completedLessonIds.has(l.id)
    ).length;

    const progress = Math.round((completedTopicLessons / totalLessons) * 100);

    return { ...topic, progress };
  });

  return (
    <div className="container py-10">
      {isLoadingSubject ? (
        <Skeleton className="h-10 w-1/2 mb-2" />
      ) : (
        subject && <h1 className="text-4xl font-bold">{subject.name}</h1>
      )}
      <p className="text-muted-foreground mt-2">
        Explore the topics below to start your learning journey.
      </p>

      <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        {!isLoading &&
          topicsWithProgress?.map((topic) => (
            <Link to={`/subject/${subjectId}/topic/${topic.id}`} key={topic.id}>
              <Card
                className="hover:shadow-lg transition-shadow duration-200 cursor-pointer h-full"
              >
                <CardHeader>
                  <CardTitle>{topic.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-sm font-medium">{topic.progress ?? 0}%</p>
                  </div>
                  <Progress value={topic.progress ?? 0} />
                </CardContent>
              </Card>
            </Link>
          ))}
        {!isLoading && (!topicsWithProgress || topicsWithProgress.length === 0) && (
          <div className="text-center py-12 md:col-span-2 lg:col-span-3">
            <h2 className="text-2xl font-semibold">No Topics Found</h2>
            <p className="text-muted-foreground mt-2">
              It looks like there are no topics for this subject yet. Please
              check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectDashboard;
