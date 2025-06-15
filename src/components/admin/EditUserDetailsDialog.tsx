
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type User = Database['public']['Functions']['get_user_details']['Returns'][number];

const editDetailsSchema = z.object({
  full_name: z.string().min(1, 'Full name is required.'),
  grade: z.coerce.number().min(1).max(12).optional().nullable(),
});

type FormValues = z.infer<typeof editDetailsSchema>;

interface EditUserDetailsDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const EditUserDetailsDialog: React.FC<EditUserDetailsDialogProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(editDetailsSchema),
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || '',
        grade: user.grade || null,
      });
    }
  }, [user, form]);

  const { mutate: updateUserDetails, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user) return;
      const { error } = await supabase.rpc('update_user_details_by_admin', {
        target_user_id: user.id,
        new_full_name: values.full_name,
        new_grade: values.grade,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({ title: 'User details updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user-details', user.id] });
      }
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update details',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateUserDetails(data);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Details for {user.full_name || user.email}</DialogTitle>
          <DialogDescription>
            Update the user's full name and grade level.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                   <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 10" 
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
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
