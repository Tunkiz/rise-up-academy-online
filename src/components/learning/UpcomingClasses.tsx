
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { Clock, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

type ClassSchedule = Tables<"class_schedules"> & {
  subjects: Pick<Tables<"subjects">, "name"> | null;
};

const UpcomingClasses = ({ userSubjectIds }: { userSubjectIds: string[] }) => {
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['upcoming_class_schedules', userSubjectIds],
    queryFn: async (): Promise<ClassSchedule[]> => {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('class_schedules')
        .select('*, subjects(name)')
        .gt('start_time', now.toISOString())
        .lt('start_time', in24Hours.toISOString())
        .in('subject_id', userSubjectIds)
        .order('start_time', { ascending: true });

      if (error) throw new Error(error.message);
      // Supabase TypeScript generator doesn't currently support typed relations, so we cast here.
      return (data as any) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-6 w-6" />
          Upcoming Classes (Next 24 Hours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 1 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isLoading && (!schedules || schedules.length === 0) && (
          <p className="text-muted-foreground text-center py-4">
            There are no classes scheduled in the next 24 hours.
          </p>
        )}
        {!isLoading && schedules && schedules.length > 0 && (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.subjects?.name || 'N/A'}</TableCell>
                    <TableCell>{schedule.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(new Date(schedule.start_time), "h:mm a")}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(schedule.start_time), { addSuffix: true })}
                        </span>
                      </div>
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
