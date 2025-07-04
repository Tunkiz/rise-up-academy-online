import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';

export const SuperAdminDebug = () => {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [roleInfo, setRoleInfo] = useState<any>(null);

  // Only super admins can access this component
  if (!isSuperAdmin) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            This diagnostic tool is only available to super administrators.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const checkSuperAdmin = async () => {
    setLoading(true);
    try {
      // Direct check from supabase
      const { data, error } = await supabase.rpc('is_super_admin');
      
      if (error) {
        throw error;
      }
      
      // Get user roles for more detail
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id);
      
      if (rolesError) {
        throw rolesError;
      }
      
      setRoleInfo({
        directCheck: data,
        contextValue: isSuperAdmin,
        roles: roles
      });
      
      toast({
        title: `Super Admin Status: ${data ? "YES" : "NO"}`,
        description: `Context reports: ${isSuperAdmin ? "YES" : "NO"}, User ID: ${user?.id}`,
      });
    } catch (error: any) {
      console.error("Error checking super admin status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check super admin status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const assignSuperAdmin = async () => {
    setLoading(true);
    try {
      // Try to self-assign super admin
      const { error } = await supabase.rpc('assign_super_admin_role', {
        target_user_id: user?.id
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "Super admin role assigned. The page will reload in a moment.",
      });

      // Refresh the page after a delay
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
      setLoading(false);
    }
  };
  
  const goToSuperAdmin = () => {
    navigate('/super-admin');
  };

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Super Admin Diagnostics</CardTitle>
        <CardDescription>
          Troubleshoot super admin access issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Auth Context Status</h3>
          <div className="text-sm bg-slate-50 p-3 rounded-md dark:bg-slate-900">
            <p>User ID: {user?.id || 'Not logged in'}</p>
            <p>Super Admin (context): {isSuperAdmin ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        {roleInfo && (
          <div>
            <h3 className="font-medium mb-2">Database Role Check</h3>
            <div className="text-sm bg-slate-50 p-3 rounded-md dark:bg-slate-900">
              <p>Direct DB Check: {roleInfo.directCheck ? 'Yes' : 'No'}</p>
              <p>Roles found: {roleInfo.roles?.length || 0}</p>
              {roleInfo.roles?.map((role: any, index: number) => (
                <div key={index} className="mt-2 border-t pt-2 border-slate-200 dark:border-slate-700">
                  <p>Role: {role.role}</p>
                  <p>Tenant ID: {role.tenant_id || 'None'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <Button onClick={checkSuperAdmin} disabled={loading}>
            {loading ? 'Checking...' : 'Refresh Super Admin Status'}
          </Button>
          <Button onClick={assignSuperAdmin} variant="outline" disabled={loading}>
            {loading ? 'Processing...' : 'Attempt to Assign Super Admin Role'}
          </Button>
          <Button onClick={goToSuperAdmin} variant="default" className="mt-4">
            Go to Super Admin Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperAdminDebug;
