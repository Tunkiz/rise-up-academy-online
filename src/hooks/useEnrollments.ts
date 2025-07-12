import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Enrollment, 
  EnrollmentStatus, 
  PaymentMethod, 
  PaymentProofUpload 
} from '@/types/enrollment';

// Hook to get user's enrollments
export function useEnrollments() {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          user_id,
          subject_id,
          tenant_id,
          status,
          enrolled_at,
          payment_due_date,
          approved_at,
          rejected_at,
          payment_method,
          payment_amount,
          payment_currency,
          payment_reference,
          payment_proof_url,
          payment_proof_filename,
          payment_proof_uploaded_at,
          reviewed_by,
          reviewed_at,
          admin_notes,
          rejection_reason,
          created_at,
          updated_at,
          subjects (
            id,
            name,
            teams_link,
            class_time,
            price
          )
        `)
        .eq('user_id', user.user.id);

      if (error) throw error;
      return data as Enrollment[];
    },
  });
}

// Hook to get all enrollments (admin only)
export function useAllEnrollments() {
  return useQuery({
    queryKey: ['all-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          user_id,
          subject_id,
          tenant_id,
          status,
          enrolled_at,
          payment_due_date,
          approved_at,
          rejected_at,
          payment_method,
          payment_amount,
          payment_currency,
          payment_reference,
          payment_proof_url,
          payment_proof_filename,
          payment_proof_uploaded_at,
          reviewed_by,
          reviewed_at,
          admin_notes,
          rejection_reason,
          created_at,
          updated_at,
          subjects (
            id,
            name,
            teams_link,
            class_time,
            price
          ),
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Enrollment & { profiles: { id: string; full_name: string; email: string } })[];
    },
  });
}

// Hook to create new enrollment
export function useCreateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      subject_id: string;
      payment_method: PaymentMethod;
      payment_amount: number;
      payment_reference?: string;
      payment_due_date?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Call the Edge Function instead of direct database insert
      const { data: result, error } = await supabase.functions.invoke('enrollment-management', {
        body: {
          action: 'create_enrollment',
          userId: user.user.id,
          courseId: data.subject_id,
          paymentMethod: data.payment_method,
          paymentAmount: data.payment_amount,
          paymentReference: data.payment_reference,
          paymentDueDate: data.payment_due_date,
        }
      });

      if (error) throw error;
      return result.enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment created successfully!');
    },
    onError: (error) => {
      console.error('Error creating enrollment:', error);
      toast.error('Failed to create enrollment');
    },
  });
}

// Hook to upload payment proof
export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PaymentProofUpload) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${data.enrollment_id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, data.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      // Call Edge Function to update enrollment
      const { data: result, error } = await supabase.functions.invoke('enrollment-management', {
        body: {
          action: 'upload_payment_proof',
          enrollmentId: data.enrollment_id,
          paymentProofUrl: urlData.publicUrl,
          paymentReference: data.payment_reference,
        }
      });

      if (error) throw error;
      return { result, uploadData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['all-enrollments'] });
      toast.success('Payment proof uploaded successfully!');
    },
    onError: (error) => {
      console.error('Error uploading payment proof:', error);
      toast.error('Failed to upload payment proof');
    },
  });
}

// Hook to approve/reject enrollment (admin only)
export function useReviewEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      enrollment_id: string;
      status: 'payment_approved' | 'payment_rejected';
      admin_notes?: string;
      rejection_reason?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const action = data.status === 'payment_approved' ? 'approve_enrollment' : 'reject_enrollment';
      
      const { data: result, error } = await supabase.functions.invoke('enrollment-management', {
        body: {
          action,
          enrollmentId: data.enrollment_id,
          adminId: user.user.id,
          notes: data.admin_notes || data.rejection_reason,
        }
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['all-enrollments'] });
      
      const action = variables.status === 'payment_approved' ? 'approved' : 'rejected';
      toast.success(`Enrollment ${action} successfully!`);
    },
    onError: (error) => {
      console.error('Error reviewing enrollment:', error);
      toast.error('Failed to review enrollment');
    },
  });
}

// Hook to update enrollment status
export function useUpdateEnrollmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      enrollment_id: string;
      status: EnrollmentStatus;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase.functions.invoke('enrollment-management', {
        body: {
          action: 'admin_review',
          enrollmentId: data.enrollment_id,
          adminId: user.user.id,
          status: data.status,
          notes: data.notes,
        }
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['all-enrollments'] });
      toast.success('Enrollment status updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating enrollment status:', error);
      toast.error('Failed to update enrollment status');
    },
  });
}

// Hook to get pending enrollments count (for admin dashboard)
export function usePendingEnrollmentsCount() {
  return useQuery({
    queryKey: ['pending-enrollments-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'payment_submitted');

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
