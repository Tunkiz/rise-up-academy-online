import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Notification, NotificationType } from '@/types/enrollment';

// Hook to get user notifications
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
  });
}

// Hook to get unread notifications count
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user.id)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook to mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    },
  });
}

// Hook to mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    },
  });
}

// Hook to delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Notification deleted');
    },
    onError: (error) => {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    },
  });
}

// Hook to create a test notification (for development purposes)
export function useCreateTestNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, any>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.user.id,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Test notification created');
    },
    onError: (error) => {
      console.error('Error creating test notification:', error);
      toast.error('Failed to create test notification');
    },
  });
}

// Hook to create notification (admin use)
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: {
      user_id: string;
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error';
      enrollment_id?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          enrollment_id: notification.enrollment_id,
          tenant_id: profile.tenant_id,
          read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
    onError: (error) => {
      console.error('Error creating notification:', error);
      toast.error('Failed to create notification');
    },
  });
}
