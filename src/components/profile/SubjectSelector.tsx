
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { Tables } from '@/integrations/supabase/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type Subject = Tables<'subjects'>;
type UserSubject = { subject_id: string };

const SubjectSelector: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    // Check if the user is an admin
    const { data: isAdmin, isLoading: isLoadingRole } = useQuery({
        queryKey: ['is-admin', user?.id],
        queryFn: async () => {
            if (!user) return false;
            const { data, error } = await supabase.rpc('is_admin');
            if (error) {
                console.error("Error checking admin role:", error);
                return false;
            }
            return data || false;
        },
        enabled: !!user,
    });

    const { data: allSubjects, isLoading: isLoadingAllSubjects } = useQuery<Subject[]>({
        queryKey: ['subjects'],
        queryFn: async () => {
            const { data, error } = await supabase.from('subjects').select('*').order('name');
            if (error) throw new Error(error.message);
            return data || [];
        },
    });

    const { data: userSubjects, isLoading: isLoadingUserSubjects } = useQuery<UserSubject[]>({
        queryKey: ['user_subjects', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase.from('user_subjects').select('subject_id').eq('user_id', user.id);
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: !!user,
    });
    
    const userSubjectIds = React.useMemo(() => new Set(userSubjects?.map(us => us.subject_id)), [userSubjects]);

    const subjectMutation = useMutation({
        mutationFn: async ({ subjectId, isSelected }: { subjectId: string, isSelected: boolean }) => {
            if (!user) throw new Error("User not found");

            // Get current user's tenant_id
            const { data: profile } = await supabase
              .from('profiles')
              .select('tenant_id')
              .eq('id', user.id)
              .single();

            if (!profile?.tenant_id) {
              throw new Error('User tenant not found');
            }

            if (isSelected) {
                const { error } = await supabase.from('user_subjects').insert({ 
                  user_id: user.id, 
                  subject_id: subjectId,
                  tenant_id: profile.tenant_id
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('user_subjects').delete().match({ user_id: user.id, subject_id: subjectId });
                if (error) throw error;
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['user_subjects', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-details', user?.id] });
            toast.success(`Subject ${variables.isSelected ? 'added' : 'removed'}!`);
        },
        onError: (error) => {
            toast.error(`Failed to update subjects: ${error.message}`);
        }
    });
    
    const handleSubjectChange = (subjectId: string) => {
        const isSelected = !userSubjectIds.has(subjectId);
        subjectMutation.mutate({ subjectId, isSelected });
    };    if (isLoadingAllSubjects || isLoadingUserSubjects || isLoadingRole) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-5 w-full mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-28" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-28" />
                </div>
            </div>
        );
    }
      return (
        <div className="space-y-4">
             <h3 className="text-lg font-medium">My Subjects</h3>
             {isAdmin ? (
                <p className="text-sm text-muted-foreground">
                    As an admin, you can manage your enrolled subjects below. Changes can only be made by users with administrative privileges.
                </p>
             ) : (
                <p className="text-sm text-muted-foreground">
                    These are the subjects assigned to you. Please contact an administrator if you need to change your subject enrollments.
                </p>
             )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {allSubjects?.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                         <Checkbox
                            id={`subject-${subject.id}`}
                            checked={userSubjectIds.has(subject.id)}
                            onCheckedChange={() => handleSubjectChange(subject.id)}
                            disabled={!isAdmin || subjectMutation.isPending}
                        />
                        <Label 
                            htmlFor={`subject-${subject.id}`} 
                            className={`font-normal ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}>
                            {subject.name}
                        </Label>
                    </div>
                ))}
            </div>
            {!isAdmin && userSubjectIds.size === 0 && (
                <p className="text-sm text-amber-500 mt-2">
                    No subjects have been assigned to you yet. Please contact your administrator.
                </p>
            )}
        </div>
    );
};

export default SubjectSelector;
