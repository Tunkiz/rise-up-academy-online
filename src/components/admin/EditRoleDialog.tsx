
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// Updated User type to include tenant_name
type User = {
  id: string;
  full_name: string | null;
  email: string;
  role: Database['public']['Enums']['app_role'];
  created_at: string;
  banned_until: string | null;
  avatar_url: string | null;
  grade: number | null;
  subjects: any;
  tenant_name: string | null;
};

type AppRole = Database['public']['Enums']['app_role'];

// Include all available roles, excluding super_admin from regular role editing
const ROLES = ['admin', 'student', 'tutor', 'parent', 'learner'] as const;

const editRoleSchema = z.object({
  role: z.enum(ROLES, {
    required_error: 'Please select a role.',
  }),
});

type EditRoleFormValues = z.infer<typeof editRoleSchema>;

interface EditRoleDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const EditRoleDialog: React.FC<EditRoleDialogProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();
  const form = useForm<EditRoleFormValues>({
    resolver: zodResolver(editRoleSchema),
  });

  React.useEffect(() => {
    if (user && user.role !== 'super_admin') {
      form.reset({ role: user.role as any });
    }
  }, [user, form]);

  const { mutate: updateUserRole, isPending } = useMutation({
    mutationFn: async (values: EditRoleFormValues) => {
      if (!user) return;
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: user.id,
        new_role: values.role,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({ title: 'Role updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user-details', user.id] });
      }
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update role',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: EditRoleFormValues) => {
    updateUserRole(data);
  };

  if (!user || user.role === 'super_admin') return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Role for {user.full_name || user.email}</DialogTitle>
          <DialogDescription>
            Select a new role for this user. This will change their permissions within their organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
