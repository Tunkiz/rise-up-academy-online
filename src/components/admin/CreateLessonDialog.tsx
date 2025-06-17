import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tables } from '@/integrations/supabase/types';
import { CreateLessonForm } from './CreateLessonForm';
import { PlusCircle } from 'lucide-react';

type Subject = Tables<'subjects'>;

interface CreateLessonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  topicId: string;
  subjectId?: string;
}

export const CreateLessonDialog: React.FC<CreateLessonDialogProps> = ({ 
  isOpen, 
  onOpenChange, 
  topicId,
  subjectId 
}) => {
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw new Error(error.message);
      return data as Subject[];
    },
  });

  const handleLessonCreated = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lesson</DialogTitle>
          <DialogDescription>
            Add a new lesson to this topic.
          </DialogDescription>
        </DialogHeader>          <CreateLessonForm 
          subjects={subjects} 
          isLoadingSubjects={isLoadingSubjects} 
          onLessonCreated={handleLessonCreated}
          initialTopicId={topicId}
          initialSubjectId={subjectId}
        />
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
