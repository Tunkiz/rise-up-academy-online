
import { useForm, useFieldArray, useFormContext } from "react-hook-form";
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
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const resourceFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  subject_id: z.string().uuid("Please select a subject."),
  file: z.instanceof(File).refine(file => file.size > 0, "A file is required."),
});

const lessonFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  subject_id: z.string().uuid("Please select a subject."),
  topic_id: z.string().uuid("Please select a topic."),
  lesson_type: z.enum(['quiz', 'video', 'notes', 'document'], { required_error: "Please select a lesson type."}),
  content: z.any().optional(),
  pass_mark: z.coerce.number().min(0).max(100).optional(),
  questions: z.array(z.object({
    question_text: z.string().min(3, "Question text must be at least 3 characters."),
    options: z.array(z.object({
        option_text: z.string().min(1, "Option text cannot be empty."),
        is_correct: z.boolean().default(false),
    })).min(2, "At least two options are required.")
    .refine(options => options.some(opt => opt.is_correct), {
        message: "At least one option must be marked as correct.",
        path: ["root"],
    })
  })).optional(),
}).superRefine((data, ctx) => {
    if (data.lesson_type === 'quiz') {
        if (data.pass_mark === undefined || data.pass_mark === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Pass mark (0-100) is required for quizzes.",
                path: ['pass_mark'],
            });
        }
        if (!data.questions || data.questions.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A quiz must have at least one question.",
                path: ['questions'],
            });
        }
    }
    if (data.lesson_type === 'video') {
        if (!data.content || !z.string().url().safeParse(data.content).success) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A valid video URL is required.",
                path: ['content'],
            });
        }
    }
    if (data.lesson_type === 'notes') {
        if (!data.content || data.content.trim().length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Content is required for notes.",
                path: ['content'],
            });
        }
    }
    if (data.lesson_type === 'document') {
        if (!data.content || !(data.content instanceof File) || data.content.size === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A document file is required.",
                path: ['content'],
            });
        }
    }
});


type ResourceFormValues = z.infer<typeof resourceFormSchema>;
type LessonFormValues = z.infer<typeof lessonFormSchema>;
type Subject = Tables<'subjects'>;
type Topic = Pick<Tables<'topics'>, 'id' | 'name'>;

const AdminPage = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedLessonSubjectId, setSelectedLessonSubjectId] = useState<string | null>(null);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "You must be an admin to view this page." });
      navigate("/dashboard");
    }
  }, [isAdmin, authLoading, navigate]);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
  });

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
        title: "",
        subject_id: "",
        topic_id: "",
        content: "",
        pass_mark: 70,
        questions: [{ question_text: "", options: [{option_text: "", is_correct: true}, {option_text: "", is_correct: false}] }]
    },
  });
  const lessonType = lessonForm.watch('lesson_type');

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: lessonForm.control,
    name: "questions",
  });

  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const { data: topics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ['topics', selectedLessonSubjectId],
    queryFn: async (): Promise<Topic[]> => {
      if (!selectedLessonSubjectId) return [];
      const { data, error } = await supabase
        .from('topics')
        .select('id, name')
        .eq('subject_id', selectedLessonSubjectId);
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!selectedLessonSubjectId,
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

  const { mutate: createLesson, isPending: isCreatingLesson } = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      const { title, topic_id, lesson_type, pass_mark, questions } = values;

      let contentToInsert: string | null = null;
      if (values.content) {
        if (lesson_type === 'video' || lesson_type === 'notes') {
          contentToInsert = values.content;
        } else if (lesson_type === 'document' && values.content instanceof File) {
          const file = values.content;
          const filePath = `public/lessons/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from('resource_files').upload(filePath, file);
          if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

          const { data: { publicUrl } } = supabase.storage.from('resource_files').getPublicUrl(filePath);
          if (!publicUrl) throw new Error("Could not get public URL for the file.");
          contentToInsert = publicUrl;
        }
      }

      const lessonData: TablesInsert<'lessons'> = {
        title,
        topic_id,
        lesson_type,
        content: contentToInsert,
        pass_mark: lesson_type === 'quiz' ? pass_mark : null,
      };

      const { data: newLesson, error } = await supabase.from('lessons').insert(lessonData).select('id').single();
      if (error) {
        throw new Error(`Failed to create lesson: ${error.message}`);
      }
      
      if (lesson_type === 'quiz' && questions) {
          for (const question of questions) {
              const { data: newQuestion, error: questionError } = await supabase
                .from('quiz_questions')
                .insert({ lesson_id: newLesson.id, question_text: question.question_text })
                .select('id')
                .single();

              if (questionError) {
                // Attempt to clean up the created lesson if question fails
                await supabase.from('lessons').delete().eq('id', newLesson.id);
                throw new Error(`Question creation failed: ${questionError.message}`);
              }

              const optionsToInsert = question.options.map(opt => ({
                question_id: newQuestion.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct,
              }));

              const { error: optionsError } = await supabase.from('quiz_options').insert(optionsToInsert);

              if (optionsError) {
                  // Attempt to clean up
                  await supabase.from('quiz_questions').delete().eq('id', newQuestion.id);
                  await supabase.from('lessons').delete().eq('id', newLesson.id);
                  throw new Error(`Options creation failed: ${optionsError.message}`);
              }
          }
      }
    },
    onSuccess: () => {
      setIsCreateLessonOpen(false);
      toast({ title: "Lesson created successfully!" });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['quiz_questions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz_options'] });
      lessonForm.reset();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Creation Failed", description: error.message });
    },
  });


  const onSubmit = (values: ResourceFormValues) => {
    uploadResource(values);
  };

  const onCreateLesson = (values: LessonFormValues) => {
    createLesson(values);
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
            <CardTitle>Create New Lesson</CardTitle>
            <CardDescription>Add a new quiz, video, notes, or document lesson.</CardDescription>
          </CardHeader>
          <CardContent>
             <Dialog open={isCreateLessonOpen} onOpenChange={setIsCreateLessonOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Lesson</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to add a new lesson.
                  </DialogDescription>
                </DialogHeader>
                <Form {...lessonForm}>
                  <form onSubmit={lessonForm.handleSubmit(onCreateLesson)} className="space-y-4 py-4">
                    <FormField control={lessonForm.control} name="title" render={({ field }) => (
                      <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Introduction to Algebra" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField
                      control={lessonForm.control}
                      name="subject_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedLessonSubjectId(value);
                              lessonForm.resetField("topic_id");
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
                    <FormField control={lessonForm.control} name="topic_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingTopics || !selectedLessonSubjectId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedLessonSubjectId
                                ? "Select a subject first"
                                : isLoadingTopics
                                ? "Loading..."
                                : "Select a topic"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {topics?.map(topic => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                    <FormField
                      control={lessonForm.control}
                      name="lesson_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lesson Type</FormLabel>
                          <Select onValueChange={(value) => { field.onChange(value); lessonForm.resetField("content"); }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a lesson type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="quiz">Quiz</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="notes">Notes</SelectItem>
                              <SelectItem value="document">Document</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {lessonType === 'quiz' && (
                        <>
                            <FormField control={lessonForm.control} name="pass_mark" render={({ field }) => (
                                <FormItem><FormLabel>Pass Mark (%)</FormLabel><FormControl><Input type="number" min="0" max="100" placeholder="e.g., 70" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            <div className="space-y-4 rounded-md border p-4">
                               <div className="flex justify-between items-center">
                                <Label className="text-lg">Questions</Label>
                                 <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => appendQuestion({ question_text: "", options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }] })}
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add Question
                                </Button>
                               </div>
                                {questionFields.map((questionItem, questionIndex) => (
                                    <div key={questionItem.id} className="space-y-3 rounded-md border p-3 relative">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeQuestion(questionIndex)} disabled={questionFields.length <= 1}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                        <FormField control={lessonForm.control} name={`questions.${questionIndex}.question_text`} render={({ field }) => (
                                            <FormItem><FormLabel>Question {questionIndex + 1}</FormLabel><FormControl><Textarea placeholder="e.g., What is 2+2?" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        
                                        <OptionsFieldArray questionIndex={questionIndex} />
                                         <FormMessage>{lessonForm.formState.errors.questions?.[questionIndex]?.options?.root?.message}</FormMessage>
                                    </div>
                                ))}
                                <FormMessage>{lessonForm.formState.errors.questions?.root?.message || lessonForm.formState.errors.questions?.message}</FormMessage>
                            </div>
                        </>
                    )}
                    {lessonType === 'video' && (
                      <FormField control={lessonForm.control} name="content" render={({ field }) => (
                        <FormItem><FormLabel>Video URL</FormLabel><FormControl><Input placeholder="e.g., https://www.youtube.com/embed/..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                    )}
                    {lessonType === 'notes' && (
                      <FormField control={lessonForm.control} name="content" render={({ field }) => (
                        <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder="Enter lesson content here..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                    )}
                     {lessonType === 'document' && (
                      <FormField
                        control={lessonForm.control}
                        name="content"
                        render={({ field: { onChange, ...fieldProps } }) => (
                           <FormItem>
                            <FormLabel>Document File</FormLabel>
                            <FormControl>
                              <Input type="file" {...fieldProps} onChange={(e) => onChange(e.target.files?.[0])} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <Button type="submit" disabled={isCreatingLesson} className="w-full">
                      {isCreatingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      Create Lesson
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        
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
      </div>
    </div>
  );
};

const OptionsFieldArray = ({ questionIndex }: { questionIndex: number }) => {
    const { control, getValues, setValue } = useFormContext<LessonFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${questionIndex}.options`
    });

    return (
        <div className="space-y-2 pl-4">
            <Label className="text-sm">Options</Label>
            {fields.map((item, optionIndex) => (
                <div key={item.id} className="flex items-start space-x-2">
                    <FormField
                        control={control}
                        name={`questions.${questionIndex}.options.${optionIndex}.option_text`}
                        render={({ field }) => (
                            <FormItem className="flex-grow"><FormControl><Input placeholder={`Option ${optionIndex + 1}`} {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`questions.${questionIndex}.options.${optionIndex}.is_correct`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            // Uncheck all other options for this question
                                            getValues(`questions.${questionIndex}.options`).forEach((_, i) => {
                                                setValue(`questions.${questionIndex}.options.${i}.is_correct`, i === optionIndex ? !!checked : false);
                                            });
                                        }}
                                        id={`is-correct-${questionIndex}-${optionIndex}`}
                                    />
                                </FormControl>
                                <Label htmlFor={`is-correct-${questionIndex}-${optionIndex}`} className="text-sm font-normal shrink-0">Correct</Label>
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(optionIndex)} disabled={fields.length <= 2}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
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
    )
}

export default AdminPage;
