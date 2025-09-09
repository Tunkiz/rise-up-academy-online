import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type SubjectCategory = Database['public']['Enums']['subject_category'];

interface TeacherCategoriesManagerProps {
  teacherId: string;
  teacherName: string;
}

const CATEGORY_LABELS: Record<SubjectCategory, string> = {
  'matric_amended': 'Matric Amended (Adult Education)',
  'national_senior': 'National Senior Certificate (Grade 10-12)',
  'senior_phase': 'Senior Phase (Grade 7-9)',
};

const TeacherCategoriesManager = ({ teacherId, teacherName }: TeacherCategoriesManagerProps) => {
  const [selectedCategories, setSelectedCategories] = useState<SubjectCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current teacher categories
  const { data: currentCategories, isLoading } = useQuery({
    queryKey: ['teacher-categories', teacherId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('teacher_categories')
        .select('category')
        .eq('teacher_id', teacherId);
      
      if (error) throw error;
      return (data || []).map((item: any) => item.category as SubjectCategory);
    },
    enabled: !!teacherId,
  });

  // Update selected categories when data loads
  useEffect(() => {
    if (currentCategories) {
      setSelectedCategories(currentCategories);
    }
  }, [currentCategories]);

  const updateCategoriesMutation = useMutation({
    mutationFn: async (categories: SubjectCategory[]) => {
      // First, remove all existing categories for this teacher
      const { error: deleteError } = await (supabase as any)
        .from('teacher_categories')
        .delete()
        .eq('teacher_id', teacherId);

      if (deleteError) throw deleteError;

      // Then, insert the new categories
      if (categories.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('teacher_categories')
          .insert(
            categories.map((category) => ({
              teacher_id: teacherId,
              category,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Categories updated for ${teacherName}`,
      });
      queryClient.invalidateQueries({ queryKey: ['teacher-categories', teacherId] });
    },
    onError: (error) => {
      console.error('Error updating categories:', error);
      toast({
        title: "Error",
        description: "Failed to update categories. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCategoryChange = (category: SubjectCategory, checked: boolean) => {
    setSelectedCategories(prev => {
      if (checked) {
        return [...prev, category];
      } else {
        return prev.filter(cat => cat !== category);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateCategoriesMutation.mutateAsync(selectedCategories);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teaching Categories for {teacherName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading categories...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teaching Categories for {teacherName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Select the categories this teacher can teach:</Label>
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={category}
                  checked={selectedCategories.includes(category as SubjectCategory)}
                  onCheckedChange={(checked) => 
                    handleCategoryChange(category as SubjectCategory, checked === true)
                  }
                  disabled={isSubmitting}
                />
                <Label htmlFor={category} className="text-sm font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Categories
                </>
              )}
            </Button>
          </div>

          {selectedCategories.length === 0 && (
            <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
              <strong>Warning:</strong> This teacher will not be assigned to any categories and won't be able to see any students.
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default TeacherCategoriesManager;
