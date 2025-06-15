
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, HelpCircle, TrendingUp } from 'lucide-react';

interface UserStatsCardProps {
  userId: string;
}

const UserStatsCard = ({ userId }: UserStatsCardProps) => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      // RPC returns an array, we need the first element.
      return data?.[0] || null;
    },
    enabled: !!userId,
  });

  const formatAverageScore = (score: number | null) => {
    if (score === null || score === undefined) {
      return 'N/A';
    }
    return `${score.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
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
        ) : stats ? (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0"/>
                    <div>
                        <p className="text-sm text-muted-foreground">Lessons Completed</p>
                        <p className="text-2xl font-bold">{stats.lessons_completed_count}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <HelpCircle className="h-8 w-8 text-blue-500 flex-shrink-0"/>
                    <div>
                        <p className="text-sm text-muted-foreground">Quizzes Attempted</p>
                        <p className="text-2xl font-bold">{stats.quizzes_attempted_count}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <TrendingUp className="h-8 w-8 text-indigo-500 flex-shrink-0"/>
                    <div>
                        <p className="text-sm text-muted-foreground">Average Quiz Score</p>
                        <p className="text-2xl font-bold">{formatAverageScore(stats.average_quiz_score)}</p>
                    </div>
                </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No statistics available for this user.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default UserStatsCard;
