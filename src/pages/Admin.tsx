import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Upload, PlusCircle, Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const resourceFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  subject_id: z.string().uuid("Please select a subject."),
  file: z.instanceof(File).refine(file => file.size > 0, "A file is required."),
});

const quizQuestionFormSchema = z.object({
  subject_id: z.string().uuid("Please select a subject."),
  lesson_id: z.string().uuid("Please select a quiz lesson."),
  question_text: z.string().min(3, "Question must be at least 3 characters."),
  options: z.array(z.object({
    option_text: z.string().min(1, "Option text cannot be empty."),
    is_correct: z.boolean().default(false),
  })).min(2, "At least two options are required."),
}).refine(data => data.options.some(opt => opt.is_correct), {
  message: "At least one option must be correct.",
  path: ["options"],
});


type ResourceFormValues = z.infer<typeof resourceFormSchema>;
type QuizQuestionFormValues = z.infer<typeof quizQuestionFormSchema>;
type Subject = Tables<'subjects'>;
type Lesson = Tables<'lessons'>;
type QuizLessonOption = Pick<Lesson, 'id' | 'title'>;

const AdminPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedQuizSubjectId, setSelectedQuizSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "You must be an admin to view this page." });
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, navigate]);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
  });

  const quizForm = useForm<QuizQuestionFormValues>({
    resolver: zodResolver(quizQuestionFormSchema),
    defaultValues: {
      subject_id: "",
      lesson_id: "",
      question_text: "",
      options: [
        { option_text: "", is_correct: true },
        { option_text: "", is_correct: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: quizForm.control,
    name: "options",
  });

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { data: quizLessons, isLoading: isLoadingQuizLessons } = useQuery({
    queryKey: ['quizLessons', selectedQuizSubjectId],
    queryFn: async (): Promise<QuizLessonOption[]> => {
      if (!selectedQuizSubjectId) return [];
      const { data, error } = await supabase.rpc('get_quiz_lessons_by_subject', {
        p_subject_id: selectedQuizSubjectId,
      });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedQuizSubjectId,
  });

  const { mutate: uploadResource, isPending } = useMutation({
    mutationFn: async (values: ResourceFormValues) => {
      const file = values.file;
      const filePath = `public/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('resource_files').upload(filePath, file);
      if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('resource_files').getPublicUrl(filePath);
      if (!publicUrl) throw new Error("Could not get public URL for the file.");

      const { error: insertError } = await supabase.from('resources').insert({
        title: values.title,
        description: values.description,
        subject_id: values.subject_id,
        file_url: publicUrl,
      });
      if (insertError) throw new Error(`Failed to save resource: ${insertError.message}`);
    },
    onSuccess: () => {
      toast({ title: "Resource uploaded successfully!" });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      form.reset();
      // Also reset file input visually
      const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    },
  });

  const { mutate: addQuizQuestion, isPending: isAddingQuestion } = useMutation({
    mutationFn: async (values: QuizQuestionFormValues) => {
      const { data: questionData, error: questionError } = await supabase
        .from('quiz_questions')
        .insert({
          lesson_id: values.lesson_id,
          question_text: values.question_text,
        })
        .select('id')
        .single();

      if (questionError) throw new Error(`Question creation failed: ${questionError.message}`);
      
      const question_id = questionData.id;
      
      const optionsToInsert = values.options.map(opt => ({
        question_id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
      }));

      const { error: optionsError } = await supabase.from('quiz_options').insert(optionsToInsert);

      if (optionsError) {
        await supabase.from('quiz_questions').delete().eq('id', question_id);
        throw new Error(`Options creation failed: ${optionsError.message}`);
      }
    },
    onSuccess: () => {
      toast({ title: "Quiz question added!" });
      queryClient.invalidateQueries({ queryKey: ['quiz_questions', 'quiz_options'] });
      quizForm.reset({
        subject_id: quizForm.getValues().subject_id,
        lesson_id: quizForm.getValues().lesson_id,
        question_text: "",
        options: [
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
        ],
      });
      // Set first option to correct after reset
      quizForm.setValue('options.0.is_correct', true);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "An error occurred", description: error.message });
    },
  });

  const onSubmit = (values: ResourceFormValues) => {
    uploadResource(values);
  };
  
  const onQuizSubmit = (values: QuizQuestionFormValues) => {
    addQuizQuestion(values);
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="container py-10">
        <div className="flex flex-col space-y-3">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold">Admin Panel</h1>
      <p className="text-muted-foreground mt-2">Manage application content here.</p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload New Resource</CardTitle>
            <CardDescription>Add a new study material to the Resource Library.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Algebra Cheatsheet" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief summary of the resource." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="subject_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingSubjects}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select a subject"} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects?.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="file" render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Resource File</FormLabel>
                    <FormControl>
                      <Input id="file-input" type="file" {...fieldProps} onChange={(e) => onChange(e.target.files?.[0])} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Resource
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add Quiz Question</CardTitle>
            <CardDescription>Create a new question for a quiz lesson.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...quizForm}>
              <form onSubmit={quizForm.handleSubmit(onQuizSubmit)} className="space-y-6">
                <FormField
                  control={quizForm.control}
                  name="subject_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedQuizSubjectId(value);
                          quizForm.resetField("lesson_id");
                        }}
                        defaultValue={field.value}
                        disabled={isLoadingSubjects}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select a subject"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={quizForm.control} name="lesson_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quiz Lesson</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingQuizLessons || !selectedQuizSubjectId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedQuizSubjectId
                                ? "Select a subject first"
                                : isLoadingQuizLessons
                                ? "Loading..."
                                : "Select a quiz"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {quizLessons?.map(lesson => <SelectItem key={lesson.id} value={lesson.id}>{lesson.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={quizForm.control} name="question_text" render={({ field }) => (
                  <FormItem><FormLabel>Question</FormLabel><FormControl><Textarea placeholder="e.g., What is the capital of France?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div>
                  <Label>Options</Label>
                  <div className="space-y-2 mt-2">
                    {fields.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <FormField
                          control={quizForm.control}
                          name={`options.${index}.option_text`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input placeholder={`Option ${index + 1}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={quizForm.control}
                          name={`options.${index}.is_correct`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 pt-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    if(checked) {
                                      quizForm.getValues().options.forEach((_, i) => {
                                        quizForm.setValue(`options.${i}.is_correct`, i === index);
                                      });
                                    } else {
                                      field.onChange(false);
                                    }
                                  }}
                                  id={`is-correct-${index}`}
                                />
                              </FormControl>
                              <Label htmlFor={`is-correct-${index}`} className="text-sm font-normal shrink-0">
                                Correct
                              </Label>
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <FormMessage>{quizForm.formState.errors.options?.root?.message}</FormMessage>
                    <FormMessage>{quizForm.formState.errors.options?.message}</FormMessage>
                  </div>
                   <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => append({ option_text: "", is_correct: false })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Option
                    </Button>
                </div>

                <Button type="submit" disabled={isAddingQuestion} className="w-full">
                  {isAddingQuestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Add Question
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;
