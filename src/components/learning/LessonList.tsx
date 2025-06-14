
import { Skeleton } from "@/components/ui/skeleton";
import type { Tables } from "@/integrations/supabase/types";
import { LessonListItem } from "./LessonListItem";
import { BookOpen, BookText } from "lucide-react";

interface LessonListProps {
    lessons: Tables<"lessons">[] | undefined;
    subjectId: string;
    topicId: string;
    completedLessonIds: Set<string>;
    onToggleLesson: (params: { lessonId: string; completed: boolean }) => void;
    isToggling: boolean;
    isUserLoggedIn: boolean;
    isLoading: boolean;
}

export const LessonList = ({
    lessons,
    subjectId,
    topicId,
    completedLessonIds,
    onToggleLesson,
    isToggling,
    isUserLoggedIn,
    isLoading
}: LessonListProps) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-5 w-4/5" />
                    <div className="ml-auto">
                    <Skeleton className="h-5 w-5" />
                    </div>
                </div>
                ))}
            </div>
        );
    }
    
    if (!lessons || lessons.length === 0) {
        return (
            <p className="text-muted-foreground text-center py-4">
                No lessons found for this topic yet.
            </p>
        );
    }

    const quizLessons = lessons.filter((lesson) => lesson.lesson_type === 'quiz');
    const otherLessons = lessons.filter((lesson) => lesson.lesson_type !== 'quiz');

    return (
        <div className="space-y-8">
            {quizLessons.length > 0 && (
                <div>
                    <h3 className="text-2xl font-semibold mb-4 flex items-center border-b pb-2">
                        <BookText className="mr-3 h-6 w-6 text-primary" />
                        Quizzes
                    </h3>
                    <div className="space-y-4">
                        {quizLessons.map((lesson) => (
                            <LessonListItem
                                key={lesson.id}
                                lesson={lesson}
                                subjectId={subjectId}
                                topicId={topicId}
                                isCompleted={completedLessonIds.has(lesson.id)}
                                onToggleCompletion={(completed) => {
                                    onToggleLesson({ lessonId: lesson.id, completed });
                                }}
                                isToggling={isToggling}
                                isUserLoggedIn={isUserLoggedIn}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {otherLessons.length > 0 && (
                <div>
                    <h3 className="text-2xl font-semibold mb-4 flex items-center border-b pb-2">
                        <BookOpen className="mr-3 h-6 w-6 text-primary" />
                        Lessons
                    </h3>
                    <div className="space-y-4">
                        {otherLessons.map((lesson) => (
                            <LessonListItem
                                key={lesson.id}
                                lesson={lesson}
                                subjectId={subjectId}
                                topicId={topicId}
                                isCompleted={completedLessonIds.has(lesson.id)}
                                onToggleCompletion={(completed) => {
                                    onToggleLesson({ lessonId: lesson.id, completed });
                                }}
                                isToggling={isToggling}
                                isUserLoggedIn={isUserLoggedIn}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
