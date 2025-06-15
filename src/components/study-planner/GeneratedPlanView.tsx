import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React from "react";

interface GeneratedPlanViewProps {
  currentPlanDetails: { goal?: string; timeframe?: string; hours_per_week?: number } | null;
  interactivePlan: string | null;
  isGenerating: boolean;
  isSaving: boolean;
  onSavePlan: () => void;
  onCheckboxToggle: (lineIndex: number, currentChecked: boolean) => void;
}

export const GeneratedPlanView = ({
  currentPlanDetails,
  interactivePlan,
  isGenerating,
  isSaving,
  onSavePlan,
  onCheckboxToggle,
}: GeneratedPlanViewProps) => {
  return (
    <Card className="max-h-[calc(100vh-8rem)] overflow-y-auto">
      <CardHeader>
        {currentPlanDetails && interactivePlan ? (
          <>
            <CardTitle className="text-xl leading-tight">{currentPlanDetails.goal}</CardTitle>
            <CardDescription className="pt-2">
              {currentPlanDetails.timeframe} &middot; {currentPlanDetails.hours_per_week} hours per week
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
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                li: ({ node, children, checked, ...props }) => {
                  // `react-markdown` passes a `checked` prop for task list items.
                  // It's `true` or `false` for tasks, and `null` for regular list items.
                  // This is the most reliable way to identify them.
                  if (typeof checked === 'boolean') {
                    // We need the node position to get the line index for the toggle callback.
                    if (node?.position) {
                      const lineIndex = node.position.start.line - 1;
                      return (
                        <li className="flex items-start list-none my-1 -ml-4" {...props}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => onCheckboxToggle(lineIndex, checked)}
                            className="mr-2 translate-y-px"
                          />
                          {/* The original children include the <input>. We slice it off to show only the text. */}
                          <span className="flex-1">{React.Children.toArray(children).slice(1)}</span>
                        </li>
                      );
                    }
                  }
                  // For regular list items, or tasks we can't make interactive, render them as-is.
                  return <li {...props}>{children}</li>;
                },
              }}
            >
              {interactivePlan}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
      {interactivePlan && (
        <CardFooter>
          <Button onClick={onSavePlan} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Plan
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
