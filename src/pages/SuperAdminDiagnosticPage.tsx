import React from 'react';
import SuperAdminDebug from '../components/admin/SuperAdminDebug';
import { useAuth } from '@/contexts/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SuperAdminDiagnosticPage = () => {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have super admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Super Admin Diagnostics</h1>
      <SuperAdminDebug />
    </div>
  );
};

export default SuperAdminDiagnosticPage;
