
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';

export const InitialSuperAdminSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);

  const handleMakeMeSuperAdmin = async () => {
    if (!user) return;

    setIsAssigning(true);
    try {
      const { error } = await supabase.rpc('assign_super_admin_role', {
        target_user_id: user.id
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "You have been assigned super admin privileges. Please refresh the page.",
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error assigning super admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign super admin role",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Initial Setup Required</CardTitle>
          <CardDescription>
            No super administrators exist in the system. As the first user, you can become the super admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleMakeMeSuperAdmin} 
            disabled={isAssigning}
            className="w-full"
          >
            {isAssigning ? "Assigning..." : "Make Me Super Admin"}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            This option is only available when no super admins exist in the system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
