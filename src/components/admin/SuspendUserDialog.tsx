import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { buttonVariants } from '../ui/button';
import { cn } from '@/lib/utils';

type User = Database['public']['Functions']['get_all_users']['Returns'][number];

interface SuspendUserDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const SuspendUserDialog: React.FC<SuspendUserDialogProps> = ({ user, isOpen, onOpenChange }) => {
  const queryClient = useQueryClient();

  const isSuspended = user?.banned_until && (user.banned_until.toLowerCase() === 'infinity' || new Date(user.banned_until) > new Date());
  const action = isSuspended ? 'unsuspend' : 'suspend';
  
  const { mutate: manageSuspension, isPending } = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.rpc('manage_user_suspension', {
        target_user_id: user.id,
        action: action,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({ title: `User ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully!` });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['user-details', user.id] });
      }
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: `Failed to ${action} user`,
        description: error.message,
      });
    },
  });

  if (!user) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to {action} this user?</AlertDialogTitle>
          <AlertDialogDescription>
            {action === 'suspend' 
              ? `This will block ${user.full_name || user.email} from accessing the application.`
              : `This will restore access for ${user.full_name || user.email} to the application.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => manageSuspension()} 
            disabled={isPending} 
            className={cn(action === 'suspend' && buttonVariants({ variant: 'destructive' }))}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
