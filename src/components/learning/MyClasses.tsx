
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { Clock, Video } from "lucide-react";

type Subject = Tables<"subjects">;

interface MyClassesProps {
  subjects: (Subject & { progress: number })[] | undefined;
  isLoading: boolean;
}

const MyClasses = ({ subjects, isLoading }: MyClassesProps) => {
  const subjectsWithClassInfo = subjects?.filter(s => s.class_time || s.teams_link);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-6 w-6" />
          My Classes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-10 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isLoading && (!subjectsWithClassInfo || subjectsWithClassInfo.length === 0) && (
          <p className="text-muted-foreground text-center py-4">
            No class times have been scheduled for your subjects yet.
          </p>
        )}
        {!isLoading && subjectsWithClassInfo && subjectsWithClassInfo.length > 0 && (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectsWithClassInfo.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      {subject.class_time || 'Not specified'}
                    </TableCell>
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
        )}
      </CardContent>
    </Card>
  );
};

export default MyClasses;
