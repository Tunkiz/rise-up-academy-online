
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

export type FormValues = {
  goal: string;
  timeframe: string;
  hours_per_week: number;
};

interface StudyPlanFormProps {
  form: UseFormReturn<FormValues>;
  onSubmit: (values: FormValues) => void;
  isGenerating: boolean;
  isLoadingProgress: boolean;
}

export const StudyPlanForm = ({ form, onSubmit, isGenerating, isLoadingProgress }: StudyPlanFormProps) => {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="goal" render={({ field }) => (
          <FormItem>
            <FormLabel>Study Goal</FormLabel>
            <FormControl><Textarea placeholder="e.g., Pass Matric Maths with 80%" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="timeframe" render={({ field }) => (
          <FormItem>
            <FormLabel>Timeframe</FormLabel>
            <FormControl><Input placeholder="e.g., 3 months" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="hours_per_week" render={({ field }) => (
          <FormItem>
            <FormLabel>Hours per Week</FormLabel>
            <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={isGenerating || isLoadingProgress} className="w-full">
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Plan
        </Button>
      </form>
    </Form>
  );
};
