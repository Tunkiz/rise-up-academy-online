import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { List, ListItem } from "@/components/ui/list";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
}

const TopicPage = () => {
  const { subjectId, topicId } = useParams<{ subjectId: string; topicId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: topic, isLoading: isLoadingTopic, error: errorLoadingTopic } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('id', topicId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch topic: ${error.message}`);
      }

      return data;
    },
    enabled: !!topicId,
  });

  const { data: lessons, isLoading: isLoadingLessons, error: errorLoadingLessons } = useQuery({
    queryKey: ['lessons', topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('topic_id', topicId)
        .order('order', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch lessons: ${error.message}`);
      }

      return data as Lesson[];
    },
    enabled: !!topicId,
  });

  const { data: lessonCompletions, isLoading: isLoadingLessonCompletions, error: errorLoadingLessonCompletions } = useQuery({
    queryKey: ['lesson-completions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('lesson_completions')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to fetch lesson completions: ${error.message}`);
      }

      return data?.map(completion => completion.lesson_id) || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (errorLoadingTopic) {
      toast.error(`Failed to load topic: ${errorLoadingTopic.message}`);
    }
    if (errorLoadingLessons) {
      toast.error(`Failed to load lessons: ${errorLoadingLessons.message}`);
    }
    if (errorLoadingLessonCompletions) {
      toast.error(`Failed to load lesson completions: ${errorLoadingLessonCompletions.message}`);
    }
  }, [errorLoadingTopic, errorLoadingLessons, errorLoadingLessonCompletions]);

  const markAsCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      const { error } = await supabase.from('lesson_completions').insert({
        user_id: user.id,
        lesson_id: lessonId,
        tenant_id: profile.tenant_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-completions', user?.id] });
      toast.success('Lesson marked as complete!');
    },
    onError: (error) => {
      toast.error(`Failed to mark lesson as complete: ${error.message}`);
    },
  });

  const isLessonComplete = (lessonId: string) => {
    return lessonCompletions?.includes(lessonId);
  };

  if (isLoadingTopic || isLoadingLessons || isLoadingLessonCompletions) {
    return <div>Loading...</div>;
  }

  if (!topic) {
    return <div>Topic not found.</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{topic.title}</h1>
        <p className="text-muted-foreground">{topic.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lessons</CardTitle>
          <CardDescription>Complete the lessons to master this topic.</CardDescription>
        </CardHeader>
        <CardContent>
          <List>
            {lessons?.map((lesson) => (
              <ListItem key={lesson.id} className="flex items-center justify-between py-2">
                <div>
                  <Link to={`/subject/${subjectId}/topic/${topicId}/lesson/${lesson.id}`} className="hover:underline">
                    {lesson.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{lesson.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`lesson-complete-${lesson.id}`}
                    checked={isLessonComplete(lesson.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        markAsCompleteMutation.mutate(lesson.id);
                      } else {
                        // Implement delete logic if needed
                      }
                    }}
                    disabled={markAsCompleteMutation.isPending}
                  />
                  <Label htmlFor={`lesson-complete-${lesson.id}`} className="text-sm font-medium cursor-pointer">
                    Complete
                  </Label>
                </div>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Button asChild className="mt-4">
        <Link to={`/subject/${subjectId}`}>Back to Subject</Link>
      </Button>
    </div>
  );
};

export default TopicPage;
