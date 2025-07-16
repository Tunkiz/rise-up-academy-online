
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isTeacher: boolean;
  userRole: 'admin' | 'teacher' | 'student';
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isTeacher: false,
  userRole: 'student',
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'student'>('student');

  useEffect(() => {
    const checkRoles = async () => {
      try {
        console.log("Checking user roles...");
        
        // Check admin role
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin');
        if (adminError) {
          console.error("Error checking admin status:", adminError.message);
          setIsAdmin(false);
        } else {
          console.log("Admin status:", adminData);
          setIsAdmin(adminData || false);
        }

        // Check super admin role
        const { data: superAdminData, error: superAdminError } = await supabase.rpc('is_super_admin');
        if (superAdminError) {
          console.error("Error checking super admin status:", superAdminError.message);
          setIsSuperAdmin(false);
        } else {
          console.log("Super admin status:", superAdminData);
          setIsSuperAdmin(superAdminData || false);
        }

        // Check user's specific role from user_roles table
        const { data: userRoleData, error: userRoleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        let teacherStatus = false;
        let finalUserRole: 'admin' | 'teacher' | 'student' = 'student';

        if (!userRoleError && userRoleData) {
          teacherStatus = userRoleData.role === 'tutor';
          console.log("Teacher status:", teacherStatus);
          
          // Determine final user role
          if (superAdminData || adminData) {
            finalUserRole = 'admin';
          } else if (teacherStatus) {
            finalUserRole = 'teacher';
          } else {
            finalUserRole = 'student';
          }
        }

        setIsTeacher(teacherStatus);
        setUserRole(finalUserRole);
        console.log("Final user role:", finalUserRole);
      } catch (error) {
        console.error("Error checking roles:", error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsTeacher(false);
        setUserRole('student');
      }
    };

    const handleAuthChange = async (session: Session | null) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await checkRoles();
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsTeacher(false);
        setUserRole('student');
      }
      setLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    isTeacher,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
