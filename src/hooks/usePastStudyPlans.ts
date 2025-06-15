
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";

type StudyPlan = Tables<'study_plans'>;

export const usePastStudyPlans = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);

    const { data: pastPlans, isLoading: isLoadingPastPlans } = useQuery({
        queryKey: ['study_plans', user?.id],
        queryFn: async (): Promise<StudyPlan[]> => {
            if (!user) return [];
            const { data, error } = await supabase.from('study_plans').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const { mutate: updatePlan, isPending: isUpdatingPlan } = useMutation({
        mutationFn: async ({ planId, content }: { planId: string, content: string }) => {
            if (!user) throw new Error("User not authenticated.");
            const { error } = await supabase
                .from('study_plans')
                .update({ plan_content: content, updated_at: new Date().toISOString() })
                .match({ id: planId, user_id: user.id });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Plan updated successfully!" });
            queryClient.invalidateQueries({ queryKey: ['study_plans', user?.id] });
            setSelectedPlan(null); // Close the dialog on success
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Error Updating Plan",
                description: error.message,
            });
        },
    });

    const { mutate: deletePlan, isPending: isDeletingPlan } = useMutation({
        mutationFn: async (planId: string) => {
            if (!user) throw new Error("User not authenticated.");
            const { error } = await supabase.from('study_plans').delete().match({ id: planId, user_id: user.id });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "Plan deleted successfully!" });
            queryClient.invalidateQueries({ queryKey: ['study_plans', user?.id] });
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Error Deleting Plan",
                description: error.message,
            });
        },
    });

    return {
        pastPlans,
        isLoadingPastPlans,
        selectedPlan,
        setSelectedPlan,
        updatePlan,
        isUpdatingPlan,
        deletePlan,
        isDeletingPlan,
    };
};
