
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";

type Subject = Tables<"subjects">;
type StudentProgress = Pick<Tables<"student_progress">, "subject_id" | "progress">;

const LearningPortal = () => {
  const { user } = useAuth();

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from("subjects").select("*");
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { data: studentProgress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ["student_progress", user?.id],
    queryFn: async (): Promise<StudentProgress[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("student_progress")
        .select("subject_id, progress")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user,
  });

  const isLoading = isLoadingSubjects || (!!user && isLoadingProgress);

  const combinedData = subjects?.map((subject) => {
    const progressItem = studentProgress?.find(
      (p) => p.subject_id === subject.id
    );
    return {
      ...subject,
      progress: progressItem?.progress ?? 0,
    };
  });

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold">Learning Portal</h1>
      <p className="text-muted-foreground mt-2">
        Your gateway to knowledge. Select a subject to start learning.
      </p>

      <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-1/4 ml-auto mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        {!isLoading &&
          combinedData?.map((subject) => (
            <Link
              to={`/subject/${subject.id}`}
              key={subject.id}
              className="no-underline text-current"
            >
              <Card className="hover:shadow-lg transition-shadow duration-200 h-full">
                <CardHeader>
                  <CardTitle>{subject.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Your progress:
                  </p>
                  <Progress value={subject.progress} className="w-full" />
                  <p className="text-right text-sm text-muted-foreground mt-1">
                    {subject.progress}%
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        {!isLoading && (!combinedData || combinedData.length === 0) && (
          <div className="text-center py-12 md:col-span-2 lg:col-span-3">
            <h2 className="text-2xl font-semibold">No Subjects Found</h2>
            <p className="text-muted-foreground mt-2">
              It looks like there are no subjects available yet. Please check
              back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default LearningPortal;
