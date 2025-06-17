import React from 'react';
import SuperAdminDebug from '../components/admin/SuperAdminDebug';

const SuperAdminDiagnosticPage = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Super Admin Diagnostics</h1>
      <SuperAdminDebug />
    </div>
  );
};

export default SuperAdminDiagnosticPage;
