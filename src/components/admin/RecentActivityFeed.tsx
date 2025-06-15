
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RecentActivityFeedProps {
  userId: string;
}

type Activity = {
    id: string;
    activity: string;
    course: string;
    date: string;
};

const RecentActivityFeed = ({ userId }: RecentActivityFeedProps) => {
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['user-activity', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_activity', {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
  });

  const getActivityIcon = (activityType: string) => {
    if (activityType.toLowerCase().includes('completed')) {
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (activityType.toLowerCase().includes('started')) {
        return <BookOpen className="h-5 w-5 text-blue-500" />;
    }
    return <Clock className="h-5 w-5 text-gray-500" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            ))}
          </div>
        ) : error ? (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
            </Alert>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-6">
            {activities.map((activity: Activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.activity)}
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-sm">{activity.activity}</p>
                  <p className="text-sm text-muted-foreground">{activity.course}</p>
                  <p className="text-xs text-muted-foreground" title={format(new Date(activity.date), 'PPP p')}>
                    {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity found for this user.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityFeed;
