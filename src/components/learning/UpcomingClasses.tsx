
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { Clock, Video } from "lucide-react";

type ClassSchedule = Tables<"class_schedules"> & {
  subjects: { name: string } | null;
};

interface UpcomingClassesProps {
  userSubjectIds: Set<string> | null;
}

const UpcomingClasses = ({ userSubjectIds }: UpcomingClassesProps) => {
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["upcoming_classes", Array.from(userSubjectIds || [])],
    queryFn: async (): Promise<ClassSchedule[]> => {
      if (!userSubjectIds || userSubjectIds.size === 0) return [];

      const { data, error } = await supabase
        .from("class_schedules")
        .select("*, subjects (name)")
        .in("subject_id", Array.from(userSubjectIds))
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userSubjectIds && userSubjectIds.size > 0,
  });

  if (!userSubjectIds) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-6 w-6" />
          Upcoming Classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                <TableHead><Skeleton className="h-5 w-40" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isLoading && (!schedules || schedules.length === 0) && (
          <p className="text-muted-foreground text-center py-4">
            No upcoming classes scheduled in your subjects.
          </p>
        )}
        {!isLoading && schedules && schedules.length > 0 && (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.subjects?.name || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{schedule.title}</TableCell>
                    <TableCell>
                      {format(new Date(schedule.start_time), "MMM d, yyyy 'at' h:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                      {schedule.meeting_link ? (
                        <Button asChild size="sm">
                          <a href={schedule.meeting_link} target="_blank" rel="noopener noreferrer">
                            <Video className="mr-2 h-4 w-4" />
                            Join
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No link</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingClasses;
