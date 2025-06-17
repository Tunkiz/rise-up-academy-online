import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FormValues } from "./form-schema";
import { useUserSubjects } from "@/hooks/useUserSubjects";

interface StudyPlanFormProps {
  form: UseFormReturn<FormValues>;
  onSubmit: (values: FormValues) => void;
  isGenerating: boolean;
}

const formatSelectedSubjects = (count: number) => {
  return `${count} subject${count === 1 ? "" : "s"} selected`;
};

export const StudyPlanForm = ({ form, onSubmit, isGenerating }: StudyPlanFormProps) => {
  const { data: userSubjects, isLoading: isLoadingSubjects } = useUserSubjects();
  
  const availableSubjects = userSubjects?.map(userSubject => ({
    value: userSubject.subject_id,
    label: userSubject.subjects.name
  })) || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="goal" render={({ field }) => (
          <FormItem>
            <FormLabel>Study Goal</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="e.g., Pass Matric Maths with 80%" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField
          control={form.control}
          name="subjects"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subjects</FormLabel>
              <FormDescription>Select from your enrolled subjects.</FormDescription>
              <div className="space-y-2">
                <FormControl>
                  <div className="flex flex-wrap gap-2 p-2 rounded-md border min-h-[2.5rem]">
                    {isLoadingSubjects ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading subjects...
                      </div>
                    ) : field.value?.map((selectedValue) => {
                      const subject = availableSubjects.find(s => s.value === selectedValue);
                      return subject ? (
                        <div
                          key={subject.value}
                          className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md"
                        >
                          <span>{subject.label}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const values = field.value?.filter(v => v !== subject.value) || [];
                              field.onChange(values);
                            }}
                            className="text-secondary-foreground/50 hover:text-secondary-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </FormControl>
                <Select
                  onValueChange={(value) => {
                    const values = field.value || [];
                    if (!values.includes(value)) {
                      field.onChange([...values, value]);
                    }
                  }}
                  value=""
                  disabled={isLoadingSubjects}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Add subject..."} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableSubjects
                      .filter(subject => !field.value?.includes(subject.value))
                      .map(subject => (
                        <SelectItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="difficulty_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty Level</FormLabel>
              <FormDescription>Choose your current level in these subjects.</FormDescription>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a difficulty level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Target Date (Optional)</FormLabel>
              <FormDescription>When do you want to achieve your goal?</FormDescription>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button                      className={cn(
                        "w-full pl-3 text-left font-normal bg-background",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date > new Date(2100, 0, 1)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField control={form.control} name="timeframe" render={({ field }) => (
          <FormItem>
            <FormLabel>Timeframe</FormLabel>
            <FormControl>
              <Input placeholder="e.g., 3 months" {...field} />
            </FormControl>
            <FormDescription>How long do you want to study for? (e.g., 2 weeks, 3 months)</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="hours_per_week" render={({ field }) => (
          <FormItem>
            <FormLabel>Hours per Week</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                placeholder="e.g., 10" 
                {...field} 
                min={1} 
                max={168} 
              />
            </FormControl>
            <FormDescription>How many hours can you dedicate per week? (1-168)</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            "Generate Plan"
          )}
        </Button>
      </form>
    </Form>
  );
};
