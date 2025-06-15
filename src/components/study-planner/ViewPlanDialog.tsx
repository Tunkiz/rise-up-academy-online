
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type StudyPlan = Tables<'study_plans'>;

interface ViewPlanDialogProps {
  plan: StudyPlan | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const ViewPlanDialog = ({ plan, isOpen, onOpenChange }: ViewPlanDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {plan && (
          <>
            <DialogHeader>
              <DialogTitle>{plan.goal}</DialogTitle>
              <DialogDescription>
                Created on {format(new Date(plan.created_at), 'PPP')} &middot; {plan.timeframe} &middot; {plan.hours_per_week} hours/week
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto pr-4">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.plan_content}</ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
