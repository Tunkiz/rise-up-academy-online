import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { BookOpen, DollarSign, Clock, Users } from 'lucide-react';
import { MultiStepRegistrationData } from '@/types/enrollment';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

interface CourseSelectionStepProps {
  data: MultiStepRegistrationData;
  onChange: (updates: Partial<MultiStepRegistrationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface Subject {
  id: string;
  name: string;
  class_time?: string;
  teams_link?: string;
  tenant_id: string;
}

export const CourseSelectionStep: React.FC<CourseSelectionStepProps> = ({
  data,
  onChange,
  onNext,
  onPrevious,
}) => {
  const [error, setError] = useState<string>('');

  const { data: subjects, isLoading, error: queryError } = useQuery({
    queryKey: ['subjects', data.subjectCategory],
    queryFn: async () => {
      console.log('Fetching subjects for category:', data.subjectCategory);
      
      // Log current auth state
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      
      // Query subjects filtered by category
      let query = supabase.from('subjects').select('*').order('name');
      
      // If a category is selected, filter by it
      if (data.subjectCategory) {
        query = query.eq('category', data.subjectCategory as Database['public']['Enums']['subject_category']);
      }
      
      console.log('Executing query for category:', data.subjectCategory);
      const { data: queryResult, error } = await query;
      
      console.log('Query result:', queryResult);
      console.log('Query error:', error);
      
      if (error) {
        console.error('Query failed. Error details:', error);
        throw error;
      }
      
      return queryResult || [];
    },
  });

  const handleSubjectToggle = (subjectId: string) => {
    const updatedSubjects = data.selectedSubjects.includes(subjectId)
      ? data.selectedSubjects.filter(id => id !== subjectId)
      : [...data.selectedSubjects, subjectId];

    onChange({ selectedSubjects: updatedSubjects });
    setError('');
  };

  const calculateTotalAmount = () => {
    // For now, we'll use a fixed price per subject
    // This should be updated when pricing is added to the subjects table
    const pricePerSubject = 50; // Default price
    return data.selectedSubjects.length * pricePerSubject;
  };

  const handleNext = () => {
    if (data.selectedSubjects.length === 0) {
      setError('Please select at least one subject');
      return;
    }

    const totalAmount = calculateTotalAmount();
    onChange({ totalAmount });
    onNext();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading subjects...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (queryError) {
    console.error('Query error details:', queryError);
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-red-500">
              <p>Error loading subjects: {queryError.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Selected category: {data.subjectCategory || 'None'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Error code: {(queryError as { code?: string }).code || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Error details: {(queryError as { details?: string }).details || 'No details'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Select Your Subjects
          </CardTitle>
          <p className="text-muted-foreground">
            Choose the subjects you'd like to enroll in for your {data.subjectCategory.replace('_', ' ').toLowerCase()} category. You can select multiple subjects.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjects && subjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className={`cursor-pointer transition-all border-2 ${
                    data.selectedSubjects.includes(subject.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => handleSubjectToggle(subject.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={data.selectedSubjects.includes(subject.id)}
                        onChange={() => handleSubjectToggle(subject.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{subject.name}</h3>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            $50
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {subject.class_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {subject.class_time}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Online classes
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No subjects available at the moment.</p>
              <p className="text-sm">Please check back later.</p>
            </div>
          )}
          
          {error && (
            <div className="text-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {data.selectedSubjects.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Selected subjects:</span>
                <Badge variant="outline">{data.selectedSubjects.length}</Badge>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span>Total amount:</span>
                <span className="text-primary">${calculateTotalAmount()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button onClick={handleNext} className="min-w-[120px]">
          Next Step
        </Button>
      </div>
    </div>
  );
};
