
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/integrations/supabase/types";

type Topic = Tables<"topics">;
type Subject = Tables<"subjects">;

const SubjectDashboard = () => {
  const { subjectId } = useParams<{ subjectId: string }>();

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

  const isLoading = isLoadingSubject || isLoadingTopics;

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
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        {!isLoading &&
          topics?.map((topic) => (
            <Card
              key={topic.id}
              className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            >
              <CardHeader>
                <CardTitle>{topic.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* TODO: Add progress per topic */}
                <p className="text-sm text-muted-foreground">Progress: 0%</p>
              </CardContent>
            </Card>
          ))}
        {!isLoading && (!topics || topics.length === 0) && (
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
