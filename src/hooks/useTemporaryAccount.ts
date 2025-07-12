import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

export interface AccountStatus {
  id: string;
  full_name: string | null;
  account_status: 'temporary' | 'pending_payment' | 'payment_submitted' | 'active' | 'suspended' | 'expired';
  temporary_expires_at: string | null;
  enrollment_completed_at: string | null;
  payment_approved_at: string | null;
  temporary_reason: string | null;
  effective_status: string;
  access_level: 'limited' | 'full' | 'suspended' | 'expired' | 'none';
  days_remaining: number | null;
}

export interface TemporaryAccountInfo {
  isTemporary: boolean;
  daysRemaining: number | null;
  expiresAt: string | null;
  accessLevel: string;
  canAccess: {
    dashboard: boolean;
    learning: boolean;
    resources: boolean;
    studyPlanner: boolean;
    profile: boolean;
  };
}

export const useTemporaryAccount = () => {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Query account status
  const { data: accountStatus, isLoading, error } = useQuery<AccountStatus>({
    queryKey: ['accountStatus', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase
        .from('account_status_view')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds to check expiration
  });

  // Check if account is expired
  const checkExpiration = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data, error } = await supabase.rpc('is_account_expired', {
        user_id: user.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (isExpired) => {
      if (isExpired) {
        queryClient.invalidateQueries({ queryKey: ['accountStatus'] });
        toast({
          title: 'Account Expired',
          description: 'Your temporary account has expired. Please complete your payment to continue.',
          variant: 'destructive',
        });
      }
    },
  });

  // Promote temporary account (admin function)
  const promoteAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('promote_temporary_account', {
        user_id: userId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['accountStatus'] });
        toast({
          title: 'Account Promoted',
          description: 'Account has been successfully promoted to active status.',
        });
      } else {
        toast({
          title: 'Promotion Failed',
          description: 'Account promotion failed. Please ensure all payments are approved.',
          variant: 'destructive',
        });
      }
    },
  });

  // Get temporary account info
  const getTemporaryAccountInfo = (): TemporaryAccountInfo => {
    if (!accountStatus) {
      return {
        isTemporary: false,
        daysRemaining: null,
        expiresAt: null,
        accessLevel: 'none',
        canAccess: {
          dashboard: false,
          learning: false,
          resources: false,
          studyPlanner: false,
          profile: false,
        },
      };
    }

    const isTemporary = accountStatus.account_status === 'temporary';
    const accessLevel = accountStatus.access_level;
    const isExpired = accountStatus.effective_status === 'expired';

    return {
      isTemporary,
      daysRemaining: accountStatus.days_remaining,
      expiresAt: accountStatus.temporary_expires_at,
      accessLevel,
      canAccess: {
        dashboard: accessLevel === 'full' || (accessLevel === 'limited' && !isExpired),
        learning: accessLevel === 'full' || (accessLevel === 'limited' && !isExpired),
        resources: accessLevel === 'full' || (accessLevel === 'limited' && !isExpired),
        studyPlanner: accessLevel === 'full',
        profile: accessLevel === 'full' || accessLevel === 'limited',
      },
    };
  };

  // Check if user can access a specific feature
  const canAccessFeature = (feature: keyof TemporaryAccountInfo['canAccess']): boolean => {
    const info = getTemporaryAccountInfo();
    return info.canAccess[feature];
  };

  // Get remaining time as formatted string
  const getRemainingTime = (): string | null => {
    if (!accountStatus?.days_remaining) return null;
    
    const days = Math.floor(accountStatus.days_remaining);
    const hours = Math.floor((accountStatus.days_remaining - days) * 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else {
      return 'Less than 1 hour remaining';
    }
  };

  // Get status color for UI
  const getStatusColor = (): string => {
    if (!accountStatus) return 'gray';
    
    switch (accountStatus.effective_status) {
      case 'active': return 'green';
      case 'temporary': return 'yellow';
      case 'pending_payment': return 'orange';
      case 'payment_submitted': return 'blue';
      case 'expired': return 'red';
      case 'suspended': return 'red';
      default: return 'gray';
    }
  };

  return {
    accountStatus,
    isLoading,
    error,
    user,
    temporaryAccountInfo: getTemporaryAccountInfo(),
    canAccessFeature,
    getRemainingTime,
    getStatusColor,
    checkExpiration: checkExpiration.mutate,
    promoteAccount: promoteAccount.mutate,
    isCheckingExpiration: checkExpiration.isPending,
    isPromotingAccount: promoteAccount.isPending,
  };
};
