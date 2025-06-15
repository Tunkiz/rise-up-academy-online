
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { Clock, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isClassInNext24Hours } from "@/lib/time-utils";

type SubjectWithClassInfo = Pick<Tables<'subjects'>, 'id' | 'name' | 'class_time' | 'teams_link'>;

const ClassSchedule = ({ userSubjectIds }: { userSubjectIds: string[] }) => {
  const { data: subjects, isLoading } = useQuery({
    queryKey: ['user_subjects_with_class_info', userSubjectIds],
    queryFn: async (): Promise<SubjectWithClassInfo[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, class_time, teams_link')
        .in('id', userSubjectIds)
        .not('class_time', 'is', null);

      if (error) throw new Error(error.message);
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userSubjectIds && userSubjectIds.length > 0,
  });

  const upcomingClasses = subjects?.filter(
    (subject) => subject.class_time && isClassInNext24Hours(subject.class_time)
  );

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-6 w-6" />
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (!upcomingClasses || upcomingClasses.length === 0) {
    // Don't render anything if there are no subjects with scheduled class times in the next 24 hours.
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-6 w-6" />
          Classes in the next 24 hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Recurring Class Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingClasses.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>{subject.class_time}</TableCell>
                  <TableCell className="text-right">
                    {subject.teams_link ? (
                      <Button asChild size="sm">
                        <a href={subject.teams_link} target="_blank" rel="noopener noreferrer">
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
      </CardContent>
    </Card>
  );
};

export default ClassSchedule;
