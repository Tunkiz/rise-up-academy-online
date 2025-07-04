import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

type SubjectCategory = 'matric_amended' | 'national_senior' | 'senior_phase';

export const useSubjectCategories = (subjectId?: string) => {
  const queryClient = useQueryClient();

  // Get categories for a specific subject
  const { data: categories, isLoading } = useQuery({
    queryKey: ['subject-categories', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await supabase.rpc('get_subject_categories', {
        p_subject_id: subjectId
      });
      if (error) throw new Error(error.message);
      return data.map(item => item.category);
    },
    enabled: !!subjectId,
  });

  // Set categories for a subject
  const { mutate: setCategories, isPending: isSettingCategories } = useMutation({
    mutationFn: async ({ subjectId, categories }: { subjectId: string; categories: SubjectCategory[] }) => {
      const { error } = await supabase.rpc('set_subject_categories', {
        p_subject_id: subjectId,
        p_categories: categories
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Categories updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to update categories", 
        description: error.message 
      });
    },
  });

  // Add a category to a subject
  const { mutate: addCategory, isPending: isAddingCategory } = useMutation({
    mutationFn: async ({ subjectId, category }: { subjectId: string; category: SubjectCategory }) => {
      const { error } = await supabase.rpc('add_subject_category', {
        p_subject_id: subjectId,
        p_category: category
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Category added successfully!" });
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to add category", 
        description: error.message 
      });
    },
  });

  // Remove a category from a subject
  const { mutate: removeCategory, isPending: isRemovingCategory } = useMutation({
    mutationFn: async ({ subjectId, category }: { subjectId: string; category: SubjectCategory }) => {
      const { error } = await supabase.rpc('remove_subject_category', {
        p_subject_id: subjectId,
        p_category: category
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Category removed successfully!" });
      queryClient.invalidateQueries({ queryKey: ['subject-categories'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to remove category", 
        description: error.message 
      });
    },
  });

  return {
    categories,
    isLoading,
    setCategories,
    isSettingCategories,
    addCategory,
    isAddingCategory,
    removeCategory,
    isRemovingCategory,
  };
};

export const useAllSubjectCategories = () => {
  return useQuery({
    queryKey: ['all-subject-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subject_categories')
        .select('*');
      if (error) throw new Error(error.message);
      return data;
    },
  });
};
