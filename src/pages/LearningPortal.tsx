
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, Video } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ClassSchedule from "@/components/learning/ClassSchedule";

type Subject = Tables<"subjects">;
type StudentProgress = Pick<
  Tables<"student_progress">,
  "subject_id" | "progress"
>;
type UserSubject = { subject_id: string };

const LearningPortal = () => {
  const { user } = useAuth();

  const { data: subjects, isLoading: isLoadingSubjects, error: subjectsError } = useQuery({
    queryKey: ["subjects"],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from("subjects").select("*");
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { data: userSubjects, isLoading: isLoadingUserSubjects, error: userSubjectsError } = useQuery({
    queryKey: ["user_subjects", user?.id],
    queryFn: async (): Promise<UserSubject[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_subjects")
        .select("subject_id")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: studentProgress, isLoading: isLoadingProgress, error: progressError } = useQuery({
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

  const isLoading = isLoadingSubjects || (!!user && (isLoadingProgress || isLoadingUserSubjects));
  const hasError = subjectsError || userSubjectsError || progressError;

  const userSubjectIds = user
    ? new Set(userSubjects?.map((us) => us.subject_id) ?? [])
    : null;

  const displayedSubjects = user
    ? subjects?.filter((s) => userSubjectIds!.has(s.id))
    : subjects;

  const combinedData = displayedSubjects?.map((subject) => {
    const progressItem = studentProgress?.find(
      (p) => p.subject_id === subject.id
    );
    return {
      ...subject,
      progress: progressItem?.progress ?? 0,
    };
  });

  const userSubjectIdsArray = userSubjectIds ? Array.from(userSubjectIds) : [];

  if (hasError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load learning portal data. Please try refreshing the page.
            {(subjectsError || userSubjectsError || progressError) && (
              <details className="mt-2">
                <summary>Error details</summary>
                <pre className="text-xs mt-1">
                  {(subjectsError?.message || userSubjectsError?.message || progressError?.message)}
                </pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 id="learning-portal-title" className="text-4xl font-bold">Learning Portal</h1>
      <p className="text-muted-foreground mt-2">
        Your gateway to knowledge. Select a subject to start learning.
      </p>

      {user && userSubjectIdsArray.length > 0 && (
        <ClassSchedule userSubjectIds={userSubjectIdsArray} />
      )}

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
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your progress:
                    </p>
                    <Progress value={subject.progress} className="w-full" />
                    <p className="text-right text-sm text-muted-foreground mt-1">
                      {subject.progress}%
                    </p>
                  </div>
                  
                  {(subject.class_time || subject.teams_link) && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Class Details:</p>
                      {subject.class_time && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{subject.class_time}</span>
                        </div>
                      )}
                      {subject.teams_link && (
                        <div className="flex items-center gap-2 text-sm">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <span className="text-blue-600 hover:text-blue-800">Meeting available</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        {!isLoading &&
          user &&
          (!displayedSubjects || displayedSubjects.length === 0) && (
            <div className="text-center py-12 md:col-span-2 lg:col-span-3">
              <h2 className="text-2xl font-semibold">No Subjects To Display</h2>
              <p className="text-muted-foreground mt-2">
                It looks like you haven't enrolled in any subjects yet.
              </p>
              <Button asChild className="mt-4">
                <Link to="/profile">Select Your Subjects</Link>
              </Button>
            </div>
          )}
        {!isLoading && !user && (!subjects || subjects.length === 0) && (
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
