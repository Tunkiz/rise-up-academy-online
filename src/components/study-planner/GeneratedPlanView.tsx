import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Download, Loader2, Save, Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { ComponentProps } from "react";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { addToGoogleCalendar } from "@/lib/calendar-utils";

interface GeneratedPlanViewProps {
  currentPlanDetails: { 
    goal?: string; 
    timeframe?: string; 
    hours_per_week?: number;
    subjects?: string[];
    difficulty_level?: string;
    target_date?: Date;
  } | null;
  interactivePlan: string | null;
  isGenerating: boolean;
  isSaving: boolean;
  onSavePlan: () => void;
  onCheckboxToggle: (lineIndex: number, currentChecked: boolean) => void;
  totalTasks: number;
  completedTasks: number;
}

// Define a type for the custom `li` component's props.
// `checked` is the key property from remark-gfm for task lists.
type CustomLiProps = ComponentProps<'li'> & {
  node?: any; // The `node` object from remark
  checked?: boolean | null; // `checked` is boolean for task lists, null for regular lists
};

export const GeneratedPlanView = ({
  currentPlanDetails,
  interactivePlan,
  isGenerating,
  isSaving,
  onSavePlan,
  onCheckboxToggle,
  totalTasks,
  completedTasks,
}: GeneratedPlanViewProps) => {
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleShare = async () => {
    if (!interactivePlan) return;

    try {
      await navigator.clipboard.writeText(interactivePlan);
      toast.success("Study plan copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy plan to clipboard");
    }
  };

  const handleExport = () => {
    if (!interactivePlan || !currentPlanDetails?.goal) return;

    const blob = new Blob([interactivePlan], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-plan-${currentPlanDetails.goal.slice(0, 30).toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddToCalendar = () => {
    if (!currentPlanDetails?.goal || !currentPlanDetails.target_date) return;

    addToGoogleCalendar({
      title: `Study Goal: ${currentPlanDetails.goal}`,
      description: interactivePlan || '',
      startDate: new Date(),
      endDate: currentPlanDetails.target_date,
    });
  };

  return (
    <Card className="max-h-[calc(100vh-8rem)] overflow-y-auto">
      <CardHeader>
        {currentPlanDetails && interactivePlan ? (
          <>
            <CardTitle className="text-xl leading-tight">
              {currentPlanDetails.goal}
              {currentPlanDetails.subjects && currentPlanDetails.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentPlanDetails.subjects.map((subject) => (
                    <span key={subject} className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {subject}
                    </span>
                  ))}
                </div>
              )}
            </CardTitle>
            <CardDescription className="pt-2 space-y-1">
              <div>{currentPlanDetails.timeframe} • {currentPlanDetails.hours_per_week} hours per week</div>
              {currentPlanDetails.difficulty_level && (
                <div className="text-sm">Level: {currentPlanDetails.difficulty_level}</div>
              )}
              {currentPlanDetails.target_date && (
                <div className="text-sm">Target: {currentPlanDetails.target_date.toLocaleDateString()}</div>
              )}
            </CardDescription>
          </>
        ) : (
          <>
            <CardTitle>Generated Study Plan</CardTitle>
            <CardDescription>Here is your personalized plan. Review and save it if you're happy.</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        {isGenerating && <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        {!isGenerating && !interactivePlan && (
          <div className="text-center text-muted-foreground py-12">
            <p>Your generated plan will appear here.</p>
          </div>
        )}
        {interactivePlan && (
          <>
            {totalTasks > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Progress ({completedTasks}/{totalTasks})
                  </p>
                  <p className="text-sm font-bold">{Math.round(progressPercentage)}%</p>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  li: ({ node, children, checked, ...props }: CustomLiProps) => {
                    const isTaskListItem = typeof checked === 'boolean';

                    if (isTaskListItem && node?.position) {
                      const lineIndex = node.position.start.line - 1;
                      return (
                        // We render a custom `li` for task list items.
                        // `list-none` removes the default bullet point.
                        <li className="flex items-start list-none my-1" {...props}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              // isChecked can be 'indeterminate', but we only handle boolean.
                              if (typeof isChecked === 'boolean') {
                                onCheckboxToggle(lineIndex, isChecked);
                              }
                            }}
                            className="mr-2 translate-y-px"
                          />
                          {/* 
                            We render the original children from react-markdown,
                            but hide the first element (the disabled checkbox) with Tailwind CSS.
                            This is more robust than slicing the children array.
                          */}
                          <span className="flex-1 [&>*:first-child]:hidden">{children}</span>
                        </li>
                      );
                    }
                    
                    // For regular list items, render them as they are.
                    return <li {...props}>{children}</li>;
                  },
                }}
              >
                {interactivePlan}
              </ReactMarkdown>
            </div>
          </>
        )}
      </CardContent>
      {interactivePlan && (
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={onSavePlan} disabled={isSaving} variant="default" className="flex-1">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Plan
          </Button>
          <Button onClick={handleShare} variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button onClick={handleExport} variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          {currentPlanDetails?.target_date && (
            <Button onClick={handleAddToCalendar} variant="outline" size="icon">
              <Calendar className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
