
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { Tables } from '@/integrations/supabase/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

type Subject = Tables<'subjects'>;
type UserSubject = { subject_id: string };

// Category display names
const categoryDisplayNames: Record<string, string> = {
  matric_amended: 'Matric Amended',
  national_senior: 'National Senior Certificate',
  senior_phase: 'Senior Phase'
};

// Group subjects by category
const groupSubjectsByCategory = (subjects: Subject[]) => {
  return subjects.reduce((acc, subject) => {
    if (!acc[subject.category]) {
      acc[subject.category] = [];
    }
    acc[subject.category].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);
};

const SubjectSelector: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [openCategories, setOpenCategories] = React.useState<Set<string>>(new Set());
    
    const toggleCategory = (category: string) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };
    
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
    const groupedSubjects = React.useMemo(() => groupSubjectsByCategory(allSubjects || []), [allSubjects]);
    
    // Get categories that have enrolled subjects
    const enrolledCategories = React.useMemo(() => {
        const categories = new Set<string>();
        Object.entries(groupedSubjects).forEach(([category, subjects]) => {
            if (subjects.some(subject => userSubjectIds.has(subject.id))) {
                categories.add(category);
            }
        });
        return categories;
    }, [groupedSubjects, userSubjectIds]);

    // For non-admin users, only show categories they're enrolled in
    const filteredGroupedSubjects = React.useMemo(() => {
        if (isAdmin) {
            return groupedSubjects;
        }
        
        // If student has no enrolled subjects, show all categories
        if (enrolledCategories.size === 0) {
            return groupedSubjects;
        }
        
        // Only show the category the student is enrolled in
        const filtered: Record<string, Subject[]> = {};
        enrolledCategories.forEach(category => {
            if (groupedSubjects[category]) {
                filtered[category] = groupedSubjects[category];
            }
        });
        return filtered;
    }, [groupedSubjects, enrolledCategories, isAdmin]);

    // Initialize open categories to show enrolled categories by default
    React.useEffect(() => {
        setOpenCategories(enrolledCategories);
    }, [enrolledCategories]);

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
        
        // Get the category of the subject being selected
        const subject = allSubjects?.find(s => s.id === subjectId);
        if (!subject) return;
        
        // If selecting a subject and user already has subjects in a different category, prevent it
        if (isSelected && !isAdmin && enrolledCategories.size > 0 && !enrolledCategories.has(subject.category)) {
            toast.error('You can only enroll in subjects from one category. Please contact an administrator to change your category.');
            return;
        }
        
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
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        These are the subjects assigned to you. Please contact an administrator if you need to change your subject enrollments.
                    </p>
                    {enrolledCategories.size === 0 && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            <strong>Note:</strong> You can only enroll in subjects from one category. Once you select subjects from a category, only that category will be shown.
                        </p>
                    )}
                </div>
             )}
            
            {Object.entries(filteredGroupedSubjects).map(([category, subjects]) => {
                const enrolledSubjectsInCategory = subjects.filter(subject => userSubjectIds.has(subject.id));
                const isOpen = openCategories.has(category);
                const hasEnrolledSubjects = enrolledSubjectsInCategory.length > 0;
                
                return (
                    <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="flex items-center gap-1 text-sm font-medium hover:text-primary"
                                >
                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    {categoryDisplayNames[category] || category}
                                </button>
                                <Badge variant={hasEnrolledSubjects ? "default" : "secondary"} className="text-xs">
                                    {enrolledSubjectsInCategory.length} enrolled
                                </Badge>
                            </div>
                        </div>
                        
                        {isOpen && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {subjects.map((subject) => (
                                    <div key={subject.id} className="flex items-center space-x-2">
                                         <Checkbox
                                            id={`subject-${subject.id}`}
                                            checked={userSubjectIds.has(subject.id)}
                                            onCheckedChange={() => handleSubjectChange(subject.id)}
                                            disabled={!isAdmin || subjectMutation.isPending}
                                        />
                                        <Label 
                                            htmlFor={`subject-${subject.id}`} 
                                            className={`font-normal ${isAdmin ? 'cursor-pointer' : 'cursor-default'} ${userSubjectIds.has(subject.id) ? 'text-primary font-medium' : ''}`}>
                                            {subject.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            
            {!isAdmin && userSubjectIds.size === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-muted rounded-lg">
                    <p className="text-sm text-amber-600 mb-2">
                        <strong>No subjects assigned yet</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Please contact your administrator to get subjects assigned to you. You can only enroll in subjects from one category.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SubjectSelector;
