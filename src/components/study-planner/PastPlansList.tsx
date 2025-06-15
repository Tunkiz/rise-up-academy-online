
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Trash, Loader2 } from "lucide-react";

type StudyPlan = Tables<'study_plans'>;

interface PastPlansListProps {
  plans: StudyPlan[];
  isLoading: boolean;
  onSelectPlan: (plan: StudyPlan) => void;
  onDeletePlan: (planId: string) => void;
  isDeletingPlan: boolean;
}

export const PastPlansList = ({ plans, isLoading, onSelectPlan, onDeletePlan, isDeletingPlan }: PastPlansListProps) => {
  if (isLoading) {
    return <p>Loading past plans...</p>;
  }
  
  if (!plans || plans.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Past Plans</h2>
      {plans.map(plan => (
         <Card key={plan.id} className="group relative transition-colors hover:bg-muted/50">
            <div onClick={() => onSelectPlan(plan)} className="cursor-pointer">
                <CardHeader>
                    <CardTitle className="text-lg pr-10">{plan.goal}</CardTitle>
                    <CardDescription>Created on {format(new Date(plan.created_at), 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{plan.plan_content}</p>
                </CardContent>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePlan(plan.id);
              }}
              disabled={isDeletingPlan}
              className="absolute top-2 right-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {isDeletingPlan ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash className="h-4 w-4 text-destructive" />}
            </Button>
         </Card>
      ))}
    </div>
  );
};
