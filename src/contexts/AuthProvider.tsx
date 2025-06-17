import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
      } catch (error) {
        console.error("Error checking roles:", error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    };
    
    const checkAdminRole = async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (error) {
          console.error("Error checking admin status:", error.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(data);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };

    const checkSuperAdminRole = async () => {
      try {
        const { data, error } = await supabase.rpc('is_super_admin');
        if (error) {
          console.error("Error checking super admin status:", error.message);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data);
        }
      } catch (error) {
        console.error("Error checking super admin status:", error);
        setIsSuperAdmin(false);
      }
    };    const handleAuthChange = async (session: Session | null) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await checkAdminRole();
        await checkSuperAdminRole();
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
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
