
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";

type Exam = Tables<"exams">;

const ExamAssistance = () => {
  const {
    data: exams,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["exams"],
    queryFn: async (): Promise<Exam[]> => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .order("exam_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const getRegistrationStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return { text: "Opens Soon", variant: "secondary" } as const;
    if (now >= start && now <= end) return { text: "Open", variant: "default" } as const;
    return { text: "Closed", variant: "destructive" } as const;
  };

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold">Exam Assistance</h1>
      <p className="text-muted-foreground mt-2">
        Stay on top of important exam registration deadlines and dates.
      </p>

      <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full mt-4" />
              </CardContent>
            </Card>
          ))}

        {!isLoading &&
          exams?.map((exam) => {
            const status = getRegistrationStatus(
              exam.registration_start_date,
              exam.registration_end_date
            );
            return (
              <Card key={exam.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{exam.name}</CardTitle>
                    <Badge variant={status.variant}>{status.text}</Badge>
                  </div>
                  {exam.description && (
                    <CardDescription className="pt-2">
                      {exam.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      Important Dates
                    </h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Registration:{" "}
                          {format(
                            new Date(exam.registration_start_date),
                            "dd MMM yyyy"
                          )}{" "}
                          -{" "}
                          {format(
                            new Date(exam.registration_end_date),
                            "dd MMM yyyy"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Exam Date:{" "}
                          {format(new Date(exam.exam_date), "dd MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button className="mt-4 w-full" disabled={status.text !== "Open"}>
                    Register Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}

        {!isLoading && error && (
          <div className="text-center py-12 md:col-span-2 lg:col-span-3 text-red-500">
            <h2 className="text-2xl font-semibold">Error loading exams</h2>
            <p className="text-muted-foreground mt-2">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && (!exams || exams.length === 0) && (
          <div className="text-center py-12 md:col-span-2 lg:col-span-3">
            <h2 className="text-2xl font-semibold">No Exams Found</h2>
            <p className="text-muted-foreground mt-2">
              It looks like there are no upcoming exams scheduled. Please check
              back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ExamAssistance;
