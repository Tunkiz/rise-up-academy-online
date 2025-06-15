
import { AITutorChat } from "@/components/exam-assistance/AITutorChat";

const ExamAssistance = () => {
  return (
    <div className="container mx-auto py-10">
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold">Exam Assistance</h1>
        <p className="mt-2 text-muted-foreground">
          Use our AI-powered tools to get help with your exam preparations.
        </p>
      </div>
      <AITutorChat />
    </div>
  );
};

export default ExamAssistance;
