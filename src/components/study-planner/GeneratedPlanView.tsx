
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { ComponentProps } from "react";

interface GeneratedPlanViewProps {
  currentPlanDetails: { goal?: string; timeframe?: string; hours_per_week?: number } | null;
  interactivePlan: string | null;
  isGenerating: boolean;
  isSaving: boolean;
  onSavePlan: () => void;
  onCheckboxToggle: (lineIndex: number, currentChecked: boolean) => void;
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
                          onCheckedChange={() => onCheckboxToggle(lineIndex, checked)}
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
