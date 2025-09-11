import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

type SubjectType = {
  id: string;
  name: string;
  category?: string;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string;
  grade: number | null;
  avatar_url: string | null;
  created_at: string;
  banned_until: string | null;
  subjects: SubjectType[];
};

const TeacherStudentManagement = () => {
  const navigate = useNavigate();

  // Get students enrolled in teacher's subjects using the new RPC function
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['teacher-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_teacher_students');

      if (error) {
        console.error('Error fetching teacher students:', error);
        throw error;
      }

      // Transform the data to match the expected format
      return data?.map(student => {
        // Parse subjects from jsonb format
        let subjects: SubjectType[] = [];
        try {
          if (Array.isArray(student.subjects)) {
            subjects = student.subjects as SubjectType[];
          } else if (typeof student.subjects === 'string') {
            subjects = JSON.parse(student.subjects) as SubjectType[];
          }
        } catch (e) {
          console.error('Error parsing subjects:', e);
          subjects = [];
        }

        return {
          id: student.id,
          full_name: student.full_name,
          email: student.email,
          grade: student.grade,
          avatar_url: student.avatar_url,
          created_at: student.created_at,
          banned_until: student.banned_until,
          subjects,
        };
      }) || [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">Error loading students: {error.message}</p>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No students are currently enrolled in your subjects.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Full Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Grade</TableHead>
          <TableHead>Enrolled Subjects</TableHead>
          <TableHead>Joined Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => {
          const isSuspended = student.banned_until && 
            (student.banned_until.toLowerCase() === 'infinity' || new Date(student.banned_until) > new Date());

          return (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                {student.full_name || 'N/A'}
                {isSuspended && <Badge variant="destructive" className="ml-2">Suspended</Badge>}
              </TableCell>
              <TableCell>{student.email}</TableCell>
              <TableCell>{student.grade || 'N/A'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {student.subjects.map((subject) => (
                    <Badge key={subject.id} variant="secondary" className="text-xs">
                      {subject.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{format(new Date(student.created_at), 'PPP')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => navigate(`/admin/user/${student.id}`)}>
                      View Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TeacherStudentManagement;
