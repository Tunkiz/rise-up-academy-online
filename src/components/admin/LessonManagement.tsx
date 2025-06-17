import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Video, FileText, CheckSquare, File as FileIcon, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditLessonDialog } from "./EditLessonDialog";
import { CreateLessonDialog } from "./CreateLessonDialog";
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
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

type Lesson = Tables<'lessons'>;
type Subject = Tables<'subjects'>;
type Topic = Tables<'topics'>;

const lessonTypeIcons: { [key: string]: React.ReactNode } = {
  video: <Video className="h-4 w-4 text-blue-500" />,
  notes: <FileText className="h-4 w-4 text-green-500" />,
  quiz: <CheckSquare className="h-4 w-4 text-purple-500" />,
  document: <FileIcon className="h-4 w-4 text-orange-500" />,
};

const lessonTypeLabels: { [key: string]: string } = {
  video: "Video",
  notes: "Notes",
  quiz: "Quiz",
  document: "Document",
};

const LessonManagement = () => {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  const { mutate: deleteLesson, isPending: isDeleting } = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Lesson deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['admin-lessons'] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to delete lesson", description: error.message });
    },
  });
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: topics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ['topics', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', selectedSubjectId)
        .order('name');
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!selectedSubjectId,
  });

  const { data: lessons, isLoading: isLoadingLessons } = useQuery({
    queryKey: ['admin-lessons', selectedSubjectId, selectedTopicId],
    queryFn: async () => {
      let query = supabase.from('lessons').select(`
        *,
        topics!inner(
          id,
          name,
          subject_id
        )
      `);

      if (selectedTopicId) {
        query = query.eq('topic_id', selectedTopicId);
      } else if (selectedSubjectId) {
        query = query.eq('topics.subject_id', selectedSubjectId);
      }

      const { data, error } = await query.order('title');
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!(selectedSubjectId || selectedTopicId || (!selectedSubjectId && !selectedTopicId)),
  });
  const handleSubjectChange = (value: string) => {
    setSelectedSubjectId(value === "all" ? null : value);
    setSelectedTopicId(null);
  };

  const handleTopicChange = (value: string) => {
    setSelectedTopicId(value === "all" ? null : value);
  };

  const handleEditClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsEditDialogOpen(true);
  };

  const handleCreateLessonClick = () => {
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between mb-4">
        <div className="flex gap-4">
          <div className="w-64">            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Filter by Subject</span>              <Select value={selectedSubjectId || "all"} onValueChange={handleSubjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger><SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects?.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>
          </div>
            <div className="w-64">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Filter by Topic</span>              <Select 
                value={selectedTopicId || "all"} 
                onValueChange={handleTopicChange} 
                disabled={!selectedSubjectId || isLoadingTopics}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedSubjectId ? "All Topics" : "Select Subject First"} />
                </SelectTrigger><SelectContent>
                  {selectedSubjectId && <SelectItem value="all">All Topics</SelectItem>}
                  {topics?.map(topic => (
                    <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <Button onClick={handleCreateLessonClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead className="w-24">Grade</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>            <TableBody>{isLoadingLessons && (
                <>{[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                ))}</>
              )}{!isLoadingLessons && lessons && lessons.length > 0 && lessons.map((lesson) => {
                const topic = lesson.topics as unknown as Topic;
                return (
                  <TableRow key={lesson.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lessonTypeIcons[lesson.lesson_type] || <FileIcon className="h-4 w-4" />}
                        <span>{lessonTypeLabels[lesson.lesson_type] || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{lesson.title}</TableCell>
                    <TableCell>
                      {subjects?.find(s => s.id === topic.subject_id)?.name || "Unknown"}
                    </TableCell>
                    <TableCell>{topic.name}</TableCell>
                    <TableCell>{lesson.grade || "All"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(lesson)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the lesson "{lesson.title}" and all its content. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteLesson(lesson.id)} 
                              className="bg-destructive hover:bg-destructive/90"
                              disabled={isDeleting}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}{!isLoadingLessons && (!lessons || lessons.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No lessons found. Click "Create New Lesson" to add one.
                  </TableCell>
                </TableRow>
              )}</TableBody>
          </Table>
        </CardContent>
      </Card>      <CreateLessonDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        topicId={selectedTopicId || ""}
        subjectId={selectedSubjectId || ""}
      />

      {selectedLesson && (
        <EditLessonDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          lesson={selectedLesson}
        />
      )}
    </div>
  );
};

export default LessonManagement;
