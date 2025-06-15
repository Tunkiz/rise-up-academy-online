import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Label } from "@/components/ui/label";
import { OptionsFieldArray } from "./form-parts/OptionsFieldArray";

const videoUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\/.+$/;

const lessonFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  subject_id: z.string().uuid("Please select a subject."),
  topic_id: z.string().uuid("Please select a topic."),
  lesson_type: z.enum(['quiz', 'video', 'notes', 'document'], { required_error: "Please select a lesson type."}),
  grade: z.string().optional(),
  content: z.any().optional(),
  attachment: z.instanceof(File).optional(),
  pass_mark: z.coerce.number().min(0).max(100).optional(),
  time_limit: z.coerce.number().min(0).optional(),
  questions: z.array(z.object({
    question_text: z.string().min(3, "Question text must be at least 3 characters."),
    explanation: z.string().optional(),
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
        if (!data.content || typeof data.content !== 'string' || !videoUrlRegex.test(data.content)) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please provide a valid YouTube or Vimeo URL.",
                path: ['content'],
            });
        }
    }
    if (data.lesson_type === 'notes') {
        if (!data.content || typeof data.content !== 'string' || data.content.trim().length === 0) {
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


export type LessonFormValues = z.infer<typeof lessonFormSchema>;
type Subject = Tables<'subjects'>;
type Topic = Pick<Tables<'topics'>, 'id' | 'name'>;

interface CreateLessonFormProps {
    subjects: Subject[] | undefined;
    isLoadingSubjects: boolean;
    onLessonCreated: () => void;
}

export const CreateLessonForm = ({ subjects, isLoadingSubjects, onLessonCreated }: CreateLessonFormProps) => {
  const queryClient = useQueryClient();
  const [selectedLessonSubjectId, setSelectedLessonSubjectId] = useState<string | null>(null);

  const lessonForm = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
        title: "",
        description: "",
        subject_id: "",
        topic_id: "",
        grade: "",
    },
  });
  const lessonType = lessonForm.watch('lesson_type');

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: lessonForm.control,
    name: "questions",
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

  const { mutate: createLesson, isPending: isCreatingLesson } = useMutation({
    mutationFn: async (values: LessonFormValues) => {
      const { title, topic_id, lesson_type, pass_mark, questions, description, time_limit, attachment, grade } = values;

      let contentToInsert: string | null = null;
      if (values.content) {
        if (lesson_type === 'video' || lesson_type === 'notes') {
          contentToInsert = values.content;
        } else if (lesson_type === 'document' && values.content instanceof File) {
          const file = values.content;
          const filePath = `lessons/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from('resource_files').upload(filePath, file);
          if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

          const { data: { publicUrl } } = supabase.storage.from('resource_files').getPublicUrl(filePath);
          if (!publicUrl) throw new Error("Could not get public URL for the file.");
          contentToInsert = publicUrl;
        }
      }

      let attachmentUrlToInsert: string | null = null;
      if (lesson_type === 'video' && attachment) {
        const filePath = `lesson_attachments/${Date.now()}_${attachment.name}`;
        const { error: uploadError } = await supabase.storage.from('resource_files').upload(filePath, attachment);
        if (uploadError) throw new Error(`Attachment upload failed: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from('resource_files').getPublicUrl(filePath);
        if (!publicUrl) throw new Error("Could not get public URL for the attachment.");
        attachmentUrlToInsert = publicUrl;
      }

      const lessonData: TablesInsert<'lessons'> = {
        title,
        topic_id,
        lesson_type,
        content: contentToInsert,
        description: description || null,
        attachment_url: attachmentUrlToInsert,
        pass_mark: lesson_type === 'quiz' ? pass_mark : null,
        time_limit: (lesson_type === 'quiz' && time_limit) ? time_limit : null,
        grade: grade && grade !== 'all' ? parseInt(grade, 10) : null,
      };

      const { data: newLesson, error } = await supabase.from('lessons').insert(lessonData).select('id').single();
      if (error) {
        throw new Error(`Failed to create lesson: ${error.message}`);
      }
      
      if (lesson_type === 'quiz' && questions) {
          for (const question of questions) {
              const { data: newQuestion, error: questionError } = await supabase
                .from('quiz_questions')
                .insert({ lesson_id: newLesson.id, question_text: question.question_text, explanation: question.explanation || null })
                .select('id')
                .single();

              if (questionError) {
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
                  await supabase.from('quiz_questions').delete().eq('id', newQuestion.id);
                  await supabase.from('lessons').delete().eq('id', newLesson.id);
                  throw new Error(`Options creation failed: ${optionsError.message}`);
              }
          }
      }
    },
    onSuccess: () => {
      onLessonCreated();
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

  const onCreateLesson = (values: LessonFormValues) => {
    createLesson(values);
  };
  
  return (
    <Form {...lessonForm}>
        <form onSubmit={lessonForm.handleSubmit(onCreateLesson)} className="space-y-4 py-4">
            <FormField control={lessonForm.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Introduction to Algebra" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={lessonForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Summary / Description (Optional)</FormLabel><FormControl><Textarea placeholder="A brief summary of the lesson." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={lessonForm.control} name="subject_id" render={({ field }) => (
                <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); setSelectedLessonSubjectId(value); lessonForm.resetField("topic_id"); }} defaultValue={field.value} disabled={isLoadingSubjects}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select a subject"} /></SelectTrigger></FormControl>
                        <SelectContent>{subjects?.map((subject) => (<SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={lessonForm.control} name="topic_id" render={({ field }) => (
                <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingTopics || !selectedLessonSubjectId}>
                        <FormControl><SelectTrigger><SelectValue placeholder={!selectedLessonSubjectId ? "Select a subject first" : isLoadingTopics ? "Loading..." : "Select a topic"} /></SelectTrigger></FormControl>
                        <SelectContent>{topics?.map(topic => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={lessonForm.control} name="grade" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="For all grades" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <SelectItem key={g} value={String(g)}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={lessonForm.control} name="lesson_type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Lesson Type</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        
                        lessonForm.setValue('content', undefined);
                        lessonForm.setValue('attachment', undefined);
                        lessonForm.setValue('questions', undefined);
                        lessonForm.setValue('pass_mark', undefined);
                        lessonForm.setValue('time_limit', undefined);

                        if (value === 'quiz') {
                            lessonForm.setValue('pass_mark', 70);
                            lessonForm.setValue('questions', [{ question_text: "", options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }], explanation: "" }]);
                        } else if (value === 'video' || value === 'notes') {
                            lessonForm.setValue('content', '');
                        } else if (value === 'document') {
                            lessonForm.setValue('content', null);
                        }
                    }} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a lesson type" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="quiz">Quiz</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="notes">Notes</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />

            {lessonType === 'quiz' && (
                <>
                    <FormField control={lessonForm.control} name="pass_mark" render={({ field }) => (
                        <FormItem><FormLabel>Pass Mark (%)</FormLabel><FormControl><Input type="number" min="0" max="100" placeholder="e.g., 70" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={lessonForm.control} name="time_limit" render={({ field }) => (
                        <FormItem><FormLabel>Time Limit (minutes, optional)</FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 30" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="space-y-4 rounded-md border p-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-lg">Questions</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => appendQuestion({ question_text: "", explanation: "", options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }] })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
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
                                <FormField control={lessonForm.control} name={`questions.${questionIndex}.explanation`} render={({ field }) => (
                                    <FormItem><FormLabel>Explanation (Optional)</FormLabel><FormControl><Textarea placeholder="Explain why the correct answer is right." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <OptionsFieldArray questionIndex={questionIndex} />
                                <FormMessage>{lessonForm.formState.errors.questions?.[questionIndex]?.options?.root?.message}</FormMessage>
                            </div>
                        ))}
                        <FormMessage>{lessonForm.formState.errors.questions?.root?.message || lessonForm.formState.errors.questions?.message}</FormMessage>
                    </div>
                </>
            )}
            {lessonType === 'video' && (
              <>
                <FormField control={lessonForm.control} name="content" render={({ field }) => (
                  <FormItem><FormLabel>Video URL</FormLabel><FormControl><Input placeholder="e.g., https://www.youtube.com/watch?v=..." {...field} value={typeof field.value === 'string' ? field.value : ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={lessonForm.control} name="attachment" render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                        <FormLabel>Upload Notes (PDF, DOC, optional)</FormLabel>
                        <FormControl><Input type="file" {...fieldProps} onChange={(e) => onChange(e.target.files?.[0])} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              </>
            )}
            {lessonType === 'notes' && (
              <FormField control={lessonForm.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder="Enter lesson content here..." {...field} value={typeof field.value === 'string' ? field.value : ''} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            {lessonType === 'document' && (
              <FormField control={lessonForm.control} name="content" render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Document File</FormLabel>
                    <FormControl><Input type="file" {...fieldProps} onChange={(e) => onChange(e.target.files?.[0])} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
            )}
            <Button type="submit" disabled={isCreatingLesson} className="w-full">
                {isCreatingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create Lesson
            </Button>
        </form>
    </Form>
  )
}
