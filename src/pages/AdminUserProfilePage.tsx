
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminUserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      // The RLS policy we just updated allows admins to fetch any profile.
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignore no rows found
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!userId,
  });

  return (
    <div className="container py-10">
       <Button asChild variant="outline" className="mb-4">
        <Link to="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Panel
        </Link>
      </Button>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User />
            User Profile
          </CardTitle>
          <CardDescription>Viewing user's personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ) : error ? (
            <p className="text-destructive">Error: {error.message}</p>
          ) : profile ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                <p className="text-lg">{profile.full_name || 'Not provided'}</p>
              </div>
               <div>
                <h3 className="text-sm font-medium text-muted-foreground">User ID</h3>
                <p className="text-lg font-mono text-sm">{userId}</p>
              </div>
            </div>
          ) : (
             <p>User profile not found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserProfilePage;
