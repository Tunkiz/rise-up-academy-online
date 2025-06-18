import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthProvider';

interface Subject {
  id: string;
  name: string;
  description: string;
}

interface UserSubject {
  subject_id: string;
  user_id: string;
}

interface DiagnosticSubjectPanelProps {
  subject: Subject;
  isEnrolled: boolean;
  refetch: () => void;
}

const DiagnosticSubjectPanel = ({ subject, isEnrolled, refetch }: DiagnosticSubjectPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const toggleEnrollment = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setIsLoading(true);

      if (isEnrolled) {
        // Unenroll user from subject
        const { error } = await supabase
          .from('user_subjects')
          .delete()
          .eq('user_id', user.id)
          .eq('subject_id', subject.id);

        if (error) {
          console.error('Error unenrolling from subject:', error);
          throw new Error('Failed to unenroll from subject');
        }
      } else {
        // Enroll user in subject
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (!profile?.tenant_id) {
          throw new Error('User tenant not found');
        }

        const { error } = await supabase
          .from('user_subjects')
          .insert({
            user_id: user.id,
            subject_id: subject.id,
            tenant_id: profile.tenant_id,
          });

        if (error) {
          console.error('Error enrolling in subject:', error);
          throw new Error('Failed to enroll in subject');
        }
      }
    },
    onSuccess: () => {
      setIsLoading(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['student-progress'] });
      queryClient.invalidateQueries({ queryKey: ['learning_stats'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['recent_activity'] });
      toast.success(`Successfully ${isEnrolled ? 'unenrolled from' : 'enrolled in'} ${subject.name}!`);
    },
    onError: (error: any) => {
      setIsLoading(false);
      console.error('Error toggling enrollment:', error);
      toast.error(error.message || 'Failed to toggle enrollment');
    },
  });

  const handleEnrollmentToggle = async () => {
    toggleEnrollment.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{subject.name}</CardTitle>
        <CardDescription>{subject.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleEnrollmentToggle} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : isEnrolled ? (
            'Unenroll'
          ) : (
            'Enroll'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DiagnosticSubjectPanel;
