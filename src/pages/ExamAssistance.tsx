
import { AITutorChat } from "@/components/exam-assistance/AITutorChat";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ExamAssistance = () => {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-4">
          <h1 id="exam-assistance-title" className="text-4xl font-bold">Exam Assistance</h1>
          <p className="mt-2 text-muted-foreground">
            Use our AI-powered tools to get help with your exam preparations.
          </p>
        </div>
        <Button asChild>
          <Link to="/tutor-notes">View Saved Notes</Link>
        </Button>
      </div>
      <AITutorChat />
    </div>
  );
};

export default ExamAssistance;
