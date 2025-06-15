import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Calendar, Clock, PlusCircle, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { ExamDialog } from "@/components/admin/ExamDialog";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Exam = Tables<"exams">;
type UserRole = Tables<"user_roles">;

const ExamAssistance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [selectedExam, setSelectedExam] = React.useState<Exam | undefined>(
    undefined
  );

  const { data: userRole } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async (): Promise<UserRole | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error && error.code !== "PGRST116") {
        // Ignore 'No rows found' error
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = userRole?.role === "admin";

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

  const deleteMutation = useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", examId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Exam deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete exam",
        description: error.message,
      });
    },
  });

  const handleCreate = () => {
    setSelectedExam(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (exam: Exam) => {
    setSelectedExam(exam);
    setIsDialogOpen(true);
  };

  const getRegistrationStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return { text: "Opens Soon", variant: "secondary" } as const;
    if (now >= start && now <= end) return { text: "Open", variant: "default" } as const;
    return { text: "Closed", variant: "destructive" } as const;
  };

  return (
    <>
      <div className="container py-10">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-4xl font-bold">Exam Assistance</h1>
            <p className="text-muted-foreground mt-2">
              Stay on top of important exam registration deadlines and dates.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          )}
        </div>

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
                  <CardContent className="flex-grow">
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
                  </CardContent>
                  <CardFooter className="flex flex-col items-stretch">
                    <Button
                      className="w-full"
                      disabled={status.text !== "Open"}
                    >
                      Register Now
                    </Button>
                    {isAdmin && (
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(exam)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the exam.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(exam.id)}
                              >
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardFooter>
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
      <ExamDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        exam={selectedExam}
      />
    </>
  );
};
export default ExamAssistance;
