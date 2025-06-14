
import { Book, BookOpen, BookText, Video } from "lucide-react";

export const LessonIcon = ({
  type,
  className,
}: {
  type: string;
  className?: string;
}) => {
  switch (type) {
    case "video":
      return <Video className={className} />;
    case "notes":
      return <BookOpen className={className} />;
    case "quiz":
      return <BookText className={className} />;
    default:
      return <Book className={className} />;
  }
};
