
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useState, useEffect, ComponentProps } from "react";
import { Loader2, Save } from "lucide-react";

type StudyPlan = Tables<"study_plans">;

// From GeneratedPlanView.tsx for interactive checklists
type CustomLiProps = ComponentProps<'li'> & {
  node?: any;
  checked?: boolean | null;
};

interface ViewPlanDialogProps {
  plan: StudyPlan | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdatePlan: (args: { planId: string; content: string }) => void;
  isUpdating: boolean;
}

export const ViewPlanDialog = ({ plan, isOpen, onOpenChange, onUpdatePlan, isUpdating }: ViewPlanDialogProps) => {
  const [editableContent, setEditableContent] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setEditableContent(plan.plan_content);
    } else {
      setEditableContent(null);
    }
  }, [plan]);

  const handleCheckboxToggle = (lineIndex: number, newCheckedState: boolean) => {
    setEditableContent(currentContent => {
      if (!currentContent) return null;
      const lines = currentContent.split('\n');
      const lineToUpdate = lines[lineIndex];
      if (typeof lineToUpdate === 'undefined') return currentContent;

      let updatedLine;
      if (newCheckedState) {
        updatedLine = lineToUpdate.replace(/\[ \]/, '[x]');
      } else {
        updatedLine = lineToUpdate.replace(/\[[xX]\]/, '[ ]');
      }
      lines[lineIndex] = updatedLine;

      return lines.join('\n');
    });
  };

  const handleSaveChanges = () => {
    if (plan && editableContent) {
      onUpdatePlan({ planId: plan.id, content: editableContent });
    }
  };

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
              <div className="prose dark:prose-invert max-w-none">
                {editableContent !== null && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      li: ({ node, children, checked, ...props }: CustomLiProps) => {
                        const isTaskListItem = typeof checked === 'boolean';
                        if (isTaskListItem && node?.position) {
                          const lineIndex = node.position.start.line - 1;
                          return (
                            <li className="flex items-start list-none my-1" {...props}>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  if (typeof isChecked === 'boolean') {
                                    handleCheckboxToggle(lineIndex, isChecked);
                                  }
                                }}
                                className="mr-2 translate-y-px"
                              />
                              <span className="flex-1 [&>*:first-child]:hidden">{children}</span>
                            </li>
                          );
                        }
                        return <li {...props}>{children}</li>;
                      },
                    }}
                  >
                    {editableContent}
                  </ReactMarkdown>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveChanges} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
