
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { EditRoleDialog } from "./EditRoleDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { SuspendUserDialog } from "./SuspendUserDialog";
import TeacherCategoriesManager from "./TeacherCategoriesManager";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Updated type to include tenant_name
type User = {
  id: string;
  full_name: string | null;
  email: string;
  role: Database['public']['Enums']['app_role'];
  created_at: string;
  banned_until: string | null;
  avatar_url: string | null;
  grade: number | null;
  subjects: unknown;
  tenant_name: string | null;
};

const UserManagementTable = () => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<User | null>(null);
  const [managingCategoriesUser, setManagingCategoriesUser] = useState<User | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users');
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching users",
          description: error.message,
        });
        throw new Error(error.message);
      }
      return data || [];
    },
  });

  // Check if current user is super admin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ['is_super_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_super_admin');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-center p-4">Failed to load users. You might not have admin privileges.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Role</TableHead>
            {isSuperAdmin && <TableHead>Organization</TableHead>}
            <TableHead>Joined Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => {
            const isSuspended = user.banned_until && (user.banned_until.toLowerCase() === 'infinity' || new Date(user.banned_until) > new Date());
            const isCurrentUser = authUser?.id === user.id;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || 'N/A'}
                  {isSuspended && <Badge variant="destructive" className="ml-2">Suspended</Badge>}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.grade || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'super_admin' ? 'destructive' : 'secondary'} className="capitalize">
                    {user.role === 'super_admin' ? 'Super Admin' : user.role}
                  </Badge>
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <Badge variant="outline">{user.tenant_name || 'No Organization'}</Badge>
                  </TableCell>
                )}
                <TableCell>{format(new Date(user.created_at), 'PPP')}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => navigate(`/admin/user/${user.id}`)}>
                        View Profile
                      </DropdownMenuItem>
                      {user.role !== 'super_admin' && (
                        <>
                          <DropdownMenuItem onSelect={() => setEditingUser(user)}>
                            Edit Role
                          </DropdownMenuItem>
                          {(user.role === 'teacher' || user.role === 'tutor') && (
                            <DropdownMenuItem onSelect={() => setManagingCategoriesUser(user)}>
                              Manage Categories
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => setResettingPasswordUser(user)}>
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setSuspendingUser(user)}
                            className={!isSuspended ? "text-destructive" : ""}
                            disabled={isCurrentUser}
                          >
                            {isSuspended ? "Unsuspend User" : "Suspend User"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <EditRoleDialog
        user={editingUser}
        isOpen={!!editingUser}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditingUser(null);
          }
        }}
      />
      <SuspendUserDialog
        user={suspendingUser}
        isOpen={!!suspendingUser}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSuspendingUser(null);
          }
        }}
      />
      <Dialog 
        open={!!managingCategoriesUser} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setManagingCategoriesUser(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Teaching Categories</DialogTitle>
          </DialogHeader>
          {managingCategoriesUser && (
            <TeacherCategoriesManager 
              teacherId={managingCategoriesUser.id}
              teacherName={managingCategoriesUser.full_name || managingCategoriesUser.email}
            />
          )}
        </DialogContent>
      </Dialog>
      <ResetPasswordDialog
        user={resettingPasswordUser}
        isOpen={!!resettingPasswordUser}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setResettingPasswordUser(null);
          }
        }}
      />
    </>
  );
};

export default UserManagementTable;
