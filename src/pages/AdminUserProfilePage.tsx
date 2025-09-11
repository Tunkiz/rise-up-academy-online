
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User, ArrowLeft, Mail, Calendar, Shield, AlertTriangle, Edit, Ban, BookOpen, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthProvider';
import RecentActivityFeed from '@/components/admin/RecentActivityFeed';
import UserStatsCard from '@/components/admin/UserStatsCard';
import StudentAcademicDetails from '@/components/admin/StudentAcademicDetails';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tables, Database } from '@/integrations/supabase/types';
import { EditRoleDialog } from '@/components/admin/EditRoleDialog';
import { SuspendUserDialog } from '@/components/admin/SuspendUserDialog';
import { EditUserDetailsDialog } from '@/components/admin/EditUserDetailsDialog';
import { EditUserSubjectsDialog } from '@/components/admin/EditUserSubjectsDialog';

// Updated User type to include all possible roles from the database enum
type UserDetails = {
  id: string;
  full_name: string | null;
  email: string;
  role: Database['public']['Enums']['app_role'];
  created_at: string;
  banned_until: string | null;
  avatar_url: string | null;
  grade: number | null;
  subjects: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  tenant_name: string | null;
};

const AdminUserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, userRole } = useAuth();
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isSuspendUserOpen, setIsSuspendUserOpen] = useState(false);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [isEditSubjectsOpen, setIsEditSubjectsOpen] = useState(false);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user-details', userId],
    queryFn: async (): Promise<UserDetails | null> => {
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  const isSuspended = user?.banned_until && (user.banned_until.toLowerCase() === 'infinity' || new Date(user.banned_until) > new Date());
  const isOwnProfile = currentUser?.id === userId;

  // Determine the back link based on user role
  const getBackLink = () => {
    if (userRole === 'admin') {
      return '/admin';
    } else if (userRole === 'teacher' || userRole === 'tutor') {
      return '/admin';
    }
    return '/dashboard';
  };

  const getBackLinkText = () => {
    if (userRole === 'admin') {
      return 'Back to Admin Panel';
    } else if (userRole === 'teacher' || userRole === 'tutor') {
      return 'Back to Management';
    }
    return 'Back to Dashboard';
  };

  return (
    <div className="container py-10">
      <Button asChild variant="outline" className="mb-4">
        <Link to={getBackLink()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {getBackLinkText()}
        </Link>
      </Button>
      <div className="max-w-5xl mx-auto grid gap-6">
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
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{user.full_name || 'N/A'}</h2>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                  {user.tenant_name && (
                    <p className="text-sm text-muted-foreground">Organization: {user.tenant_name}</p>
                  )}
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
                    <div>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-base px-3 py-1">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-muted-foreground">Joined</h3>
                    <p className="text-base">{format(new Date(user.created_at), 'PPP')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <GraduationCap className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-muted-foreground">Grade</h3>
                    <p className="text-base">{user.grade || 'Not set'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="w-full">
                      <h3 className="font-medium text-muted-foreground">Registered Subjects</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                          {user.subjects && (user.subjects as Tables<'subjects'>[]).length > 0 ? (
                              (user.subjects as Tables<'subjects'>[]).map((subject) => (
                                  <Badge key={subject.id} variant="secondary">{subject.name}</Badge>
                              ))
                          ) : (
                              <p className="text-base text-muted-foreground">No subjects registered.</p>
                          )}
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
              <div className="flex w-full justify-end gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setIsEditDetailsOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </Button>
                 <Button variant="outline" onClick={() => setIsEditSubjectsOpen(true)} disabled={isOwnProfile}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Subjects
                </Button>
                <Button variant="outline" onClick={() => setIsEditRoleOpen(true)} disabled={isOwnProfile}>
                  <Shield className="mr-2 h-4 w-4" />
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

        {user && !isLoading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <UserStatsCard userId={user.id} />
            <RecentActivityFeed userId={user.id} />
          </div>
        )}

        {user && !isLoading && user.role === 'student' && (
          <StudentAcademicDetails userId={user.id} />
        )}
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
          <EditUserDetailsDialog
            user={user}
            isOpen={isEditDetailsOpen}
            onOpenChange={setIsEditDetailsOpen}
          />
          <EditUserSubjectsDialog
            user={user}
            isOpen={isEditSubjectsOpen}
            onOpenChange={setIsEditSubjectsOpen}
          />
        </>
      )}
    </div>
  );
};

export default AdminUserProfilePage;
