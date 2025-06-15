
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle } from 'lucide-react';
import { Database, Tables } from '@/integrations/supabase/types';
import { Skeleton } from '../ui/skeleton';

type User = Database['public']['Functions']['get_user_details']['Returns'][number];
type Subject = Tables<'subjects'>;

const editSubjectsSchema = z.object({
  subject_ids: z.array(z.string().uuid()),
});

type FormValues = z.infer<typeof editSubjectsSchema>;

interface EditUserSubjectsDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const EditUserSubjectsDialog: React.FC<EditUserSubjectsDialogProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(editSubjectsSchema),
    defaultValues: {
      subject_ids: [],
    },
  });

  const { data: allSubjects, isLoading: isLoadingSubjects, error: subjectsError } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  React.useEffect(() => {
    if (user && user.subjects) {
      const userSubjectIds = (user.subjects as Subject[]).map(s => s.id);
      form.reset({ subject_ids: userSubjectIds });
    }
  }, [user, form]);
  
  const { mutate: updateUserSubjects, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user) return;
      const { error } = await supabase.rpc('update_user_subjects_by_admin', {
        target_user_id: user.id,
        new_subject_ids: values.subject_ids,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: 'User subjects updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user-details', user.id] });
      }
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update subjects',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateUserSubjects(data);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Subjects for {user.full_name || user.email}</DialogTitle>
          <DialogDescription>
            Select the subjects this user is enrolled in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Available Subjects</FormLabel>
                  <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {isLoadingSubjects ? (
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ) : subjectsError ? (
                      <div className="text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>Error loading subjects.</span>
                      </div>
                    ) : (
                      allSubjects?.map((subject) => (
                        <FormField
                          key={subject.id}
                          control={form.control}
                          name="subject_ids"
                          render={({ field }) => {
                            return (
                              <FormItem key={subject.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(subject.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), subject.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== subject.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {subject.name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))
                    )}
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending || isLoadingSubjects}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
