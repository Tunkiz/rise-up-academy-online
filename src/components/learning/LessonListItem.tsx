
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { LessonIcon } from "./LessonIcon";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";

interface LessonListItemProps {
  lesson: Tables<"lessons">;
  subjectId: string;
  topicId: string;
  isCompleted: boolean;
  onToggleCompletion: (completed: boolean) => void;
  isToggling: boolean;
  isUserLoggedIn: boolean;
}

export const LessonListItem = ({
  lesson,
  subjectId,
  topicId,
  isCompleted,
  onToggleCompletion,
  isToggling,
  isUserLoggedIn,
}: LessonListItemProps) => {
  return (
    <div
      className="flex items-center space-x-4 p-4 border rounded-md"
    >
      <LessonIcon type={lesson.lesson_type} className="h-5 w-5 text-muted-foreground" />
      <Link to={`/subject/${subjectId}/topic/${topicId}/lesson/${lesson.id}`} className="flex-grow hover:underline">
        {lesson.title}
      </Link>
      <Badge variant="outline" className="capitalize">{lesson.lesson_type}</Badge>
      <Checkbox
        id={`lesson-${lesson.id}`}
        checked={isCompleted}
        onCheckedChange={(checked) => {
          onToggleCompletion(!!checked);
        }}
        disabled={!isUserLoggedIn || isToggling}
      />
    </div>
  );
};
