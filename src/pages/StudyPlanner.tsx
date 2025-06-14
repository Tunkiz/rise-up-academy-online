
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";

const formSchema = z.object({
  goal: z.string().min(10, { message: "Please describe your goal in at least 10 characters." }),
  timeframe: z.string().min(3, { message: "Please provide a timeframe (e.g., '3 months')." }),
  hours_per_week: z.coerce.number().min(1, { message: "Please enter at least 1 hour per week." }),
});

type FormValues = z.infer<typeof formSchema>;
type StudyPlan = Tables<'study_plans'>;

const StudyPlanner = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [currentPlanDetails, setCurrentPlanDetails] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { goal: "", timeframe: "", hours_per_week: 10 },
  });

  const { data: pastPlans, isLoading: isLoadingPastPlans } = useQuery({
    queryKey: ['study_plans', user?.id],
    queryFn: async (): Promise<StudyPlan[]> => {
      if (!user) return [];
      const { data, error } = await supabase.from('study_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { mutate: generatePlan, isPending: isGenerating } = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase.functions.invoke('study-plan-generator', { body: values });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data.plan as string;
    },
    onSuccess: (data, variables) => {
      setGeneratedPlan(data);
      setCurrentPlanDetails(variables);
      toast({ title: "Study plan generated successfully!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error Generating Plan",
        description: error.message || "An unexpected error occurred. Please ensure your Perplexity API key is set correctly in your Supabase secrets.",
      });
    },
  });

  const { mutate: savePlan, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      if (!generatedPlan || !user || !currentPlanDetails) throw new Error("No plan to save.");
      const { error } = await supabase.from('study_plans').insert({
        user_id: user.id,
        ...currentPlanDetails,
        plan_content: generatedPlan,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plan saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ['study_plans', user?.id] });
      setGeneratedPlan(null);
      setCurrentPlanDetails(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error Saving Plan",
        description: error.message,
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    generatePlan(values);
  };
  
  return (
    <div className="container py-10">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-bold">AI Study Planner</h1>
            <p className="text-muted-foreground mt-2">Let our AI build the perfect study plan for you.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Create Your Plan</CardTitle>
              <CardDescription>Tell us your goals, and we'll generate a personalized plan.</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <Button type="submit" disabled={isGenerating} className="w-full">
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Plan
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {isLoadingPastPlans && <p>Loading past plans...</p>}
          {pastPlans && pastPlans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Your Past Plans</h2>
              {pastPlans.map(plan => (
                 <Card key={plan.id}>
                    <CardHeader>
                        <CardTitle className="text-lg">{plan.goal}</CardTitle>
                        <CardDescription>Created on {format(new Date(plan.created_at), 'PPP')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{plan.plan_content}</p>
                    </CardContent>
                 </Card>
              ))}
            </div>
          )}

        </div>
        <div className="sticky top-24 self-start">
          <Card className="max-h-[calc(100vh-8rem)] overflow-y-auto">
            <CardHeader>
              <CardTitle>Generated Study Plan</CardTitle>
              <CardDescription>Here is your personalized plan. Review and save it if you're happy.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating && <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
              {!isGenerating && !generatedPlan && (
                <div className="text-center text-muted-foreground py-12">
                  <p>Your generated plan will appear here.</p>
                </div>
              )}
              {generatedPlan && <pre className="whitespace-pre-wrap font-sans text-sm">{generatedPlan}</pre>}
            </CardContent>
            {generatedPlan && (
              <CardFooter>
                <Button onClick={() => savePlan()} disabled={isSaving} className="w-full">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Plan
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanner;
