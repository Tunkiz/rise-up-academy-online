import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ArrowLeft, Mail, Calendar, Shield, AlertTriangle, Edit, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthProvider';
import { EditRoleDialog } from '@/components/admin/EditRoleDialog';
import { SuspendUserDialog } from '@/components/admin/SuspendUserDialog';
import RecentActivityFeed from '@/components/admin/RecentActivityFeed';

const AdminUserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isSuspendUserOpen, setIsSuspendUserOpen] = useState(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user-details', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc('get_user_details', {
        p_user_id: userId,
      });

      if (error) {
        throw new Error(error.message);
      }
      // The RPC returns an array, so we take the first element.
      return data?.[0] || null;
    },
    enabled: !!userId,
  });

  const isSuspended = user?.banned_until && (user.banned_until.toLowerCase() === 'infinity' || new Date(user.banned_until) > new Date());
  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="container py-10">
      <Button asChild variant="outline" className="mb-4">
        <Link to="/admin">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Panel
        </Link>
      </Button>
      <div className="max-w-2xl mx-auto grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User />
              User Profile
            </CardTitle>
            <CardDescription>Viewing user's detailed information and managing their account.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-1/4" />
            </div>
          ) : error ? (
              <p className="text-destructive">Error: {error.message}</p>
            ) : user ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user.full_name || 'N/A'}</h2>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
              </div>

              {isSuspended && (
                <div className="flex items-center p-3 rounded-md bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                  <p className="font-medium">This user is currently suspended.</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-muted-foreground">Email</h3>
                    <p className="text-base break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-muted-foreground">Role</h3>
                    <p>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-base px-3 py-1">
                        {user.role}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-muted-foreground">Joined</h3>
                    <p className="text-base">{format(new Date(user.created_at), 'PPP')}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
               <p>User profile not found.</p>
            )}
          </CardContent>
          {user && (
            <CardFooter className="border-t bg-muted/20 px-6 py-4">
              <div className="flex w-full justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditRoleOpen(true)} disabled={isOwnProfile}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Role
                </Button>
                <Button
                  variant={isSuspended ? 'secondary' : 'destructive'}
                  onClick={() => setIsSuspendUserOpen(true)}
                  disabled={isOwnProfile}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {isSuspended ? 'Unsuspend User' : 'Suspend User'}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {user && !isLoading && <RecentActivityFeed userId={user.id} />}
      </div>
      {user && (
        <>
          <EditRoleDialog
            user={user}
            isOpen={isEditRoleOpen}
            onOpenChange={setIsEditRoleOpen}
          />
          <SuspendUserDialog
            user={user}
            isOpen={isSuspendUserOpen}
            onOpenChange={setIsSuspendUserOpen}
          />
        </>
      )}
    </div>
  );
};

export default AdminUserProfilePage;
