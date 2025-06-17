import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SuperAdminDashboard from "@/components/admin/SuperAdminDashboard";

interface TenantFormState {
    name: string;
    domain: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
}

const SuperAdminPage = () => {
    const { user, loading: authLoading, isSuperAdmin } = useAuth();
    const { toast } = useToast();
    const [tenantForm, setTenantForm] = useState<TenantFormState>({
        name: "",
        domain: "",
        adminEmail: "",
        adminPassword: "",
        adminFullName: ""
    });
    const [superAdminEmail, setSuperAdminEmail] = useState("");
    const [isCreatingTenant, setIsCreatingTenant] = useState(false);
    const [isAssigningSuperAdmin, setIsAssigningSuperAdmin] = useState(false);

    // Get all tenants
    const { data: tenants, refetch: refetchTenants } = useQuery({
        queryKey: ['all-tenants'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!isSuperAdmin,
    });

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingTenant(true);

        try {
            // Create the tenant
            const { data, error } = await supabase.rpc('create_tenant', {
                tenant_name: tenantForm.name,
                tenant_domain: tenantForm.domain,
                admin_email: tenantForm.adminEmail,
                admin_password: tenantForm.adminPassword,
                admin_full_name: tenantForm.adminFullName
            });

            if (error) throw error;

            toast({
                title: "Tenant created successfully!",
                description: `${tenantForm.name} has been created.`,
            });

            setTenantForm({
                name: "",
                domain: "",
                adminEmail: "",
                adminPassword: "",
                adminFullName: ""
            });
            refetchTenants();
        } catch (error: any) {
            console.error("Error creating tenant:", error);
            toast({
                title: "Error creating tenant",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsCreatingTenant(false);
        }
    };

    const handleAssignSuperAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAssigningSuperAdmin(true);

        try {
            // First, get the user by email/ID
            const { data: users, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', superAdminEmail);

            if (userError) throw userError;

            if (!users || users.length === 0) {
                throw new Error("User not found with that ID");
            }

            // Assign super admin role
            const { error } = await supabase.rpc('assign_super_admin_role', {
                target_user_id: users[0].id
            });

            if (error) throw error;

            toast({
                title: "Super admin assigned successfully!",
                description: "The user has been granted super admin privileges.",
            });

            setSuperAdminEmail("");
        } catch (error: any) {
            console.error("Error assigning super admin:", error);
            toast({
                title: "Error assigning super admin",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsAssigningSuperAdmin(false);
        }
    };

    if (authLoading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!isSuperAdmin) {
        return (
            <div className="flex justify-center items-center h-screen">
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
        <div className="container mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Super Admin Panel</h1>
                <p className="text-muted-foreground">Manage tenants and super administrators</p>
            </div>

            <SuperAdminDashboard />

            <div className="grid gap-8 md:grid-cols-2">
                {/* Create Tenant */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Tenant</CardTitle>
                        <CardDescription>
                            Add a new organization to the platform
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTenant} className="space-y-4">
                            <div>
                                <Label htmlFor="tenant-name">Organization Name</Label>
                                <Input
                                    id="tenant-name"
                                    value={tenantForm.name}
                                    onChange={(e) => setTenantForm({...tenantForm, name: e.target.value})}
                                    placeholder="Acme University"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="tenant-domain">Domain</Label>
                                <Input
                                    id="tenant-domain"
                                    value={tenantForm.domain}
                                    onChange={(e) => setTenantForm({...tenantForm, domain: e.target.value})}
                                    placeholder="acme.edu"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="admin-name">Admin Full Name</Label>
                                <Input
                                    id="admin-name"
                                    value={tenantForm.adminFullName}
                                    onChange={(e) => setTenantForm({...tenantForm, adminFullName: e.target.value})}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="admin-email">Admin Email</Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    value={tenantForm.adminEmail}
                                    onChange={(e) => setTenantForm({...tenantForm, adminEmail: e.target.value})}
                                    placeholder="admin@acme.edu"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="admin-password">Admin Password</Label>
                                <Input
                                    id="admin-password"
                                    type="password"
                                    value={tenantForm.adminPassword}
                                    onChange={(e) => setTenantForm({...tenantForm, adminPassword: e.target.value})}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isCreatingTenant}>
                                {isCreatingTenant ? "Creating..." : "Create Tenant"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Assign Super Admin */}
                <Card>
                    <CardHeader>
                        <CardTitle>Assign Super Admin</CardTitle>
                        <CardDescription>
                            Grant super admin privileges to a user
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAssignSuperAdmin} className="space-y-4">
                            <div>
                                <Label htmlFor="super-admin-email">User ID</Label>
                                <Input
                                    id="super-admin-email"
                                    value={superAdminEmail}
                                    onChange={(e) => setSuperAdminEmail(e.target.value)}
                                    placeholder="User UUID"
                                    required
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    Enter the user's UUID to grant super admin privileges
                                </p>
                            </div>
                            <Button type="submit" className="w-full" disabled={isAssigningSuperAdmin}>
                                {isAssigningSuperAdmin ? "Assigning..." : "Assign Super Admin"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Tenants List */}
            <Card>
                <CardHeader>
                    <CardTitle>Existing Tenants</CardTitle>
                    <CardDescription>
                        All organizations on the platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tenants && tenants.length > 0 ? (
                        <div className="space-y-4">
                            {tenants.map((tenant) => (
                                <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <h3 className="font-semibold">{tenant.name}</h3>
                                        <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Created: {new Date(tenant.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {tenant.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No tenants found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SuperAdminPage;
