
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const NotificationBell = () => {
  const { user } = useAuth();

  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ['activity', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('recent_activity')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const hasUnread = activityData && activityData.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between p-4 pb-2">
            <h4 className="font-medium text-sm">Recent Activity</h4>
        </div>
        <Separator />
        <div className="p-2 max-h-96 overflow-y-auto">
          {isActivityLoading ? (
            <div className="space-y-4 p-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activityData && activityData.length > 0 ? (
            <ul className="space-y-1">
              {activityData.map((activity) => (
                <li key={activity.id} className="p-2 rounded-md hover:bg-muted">
                  <p className="text-sm font-medium">{activity.activity}</p>
                  <p className="text-xs text-muted-foreground">{activity.course}</p>
                  <p className="text-xs text-muted-foreground pt-1">
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center p-4">No recent activity.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
