import { useAuth } from "@/contexts/AuthProvider";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'teacher' | 'student')[];
  fallbackPath?: string;
}

export const RoleBasedRoute = ({ 
  children, 
  allowedRoles, 
  fallbackPath = "/dashboard" 
}: RoleBasedRouteProps) => {
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Determine user's role
  let userRole: 'admin' | 'teacher' | 'student' = 'student';
  
  if (isSuperAdmin) {
    userRole = 'admin'; // Super admin has admin access
  } else if (isAdmin) {
    userRole = 'admin'; // Regular admin
  }
  // For now, treating all admins as having admin access
  // In the future, you might want to distinguish between admin and teacher roles

  // Check if user's role is in allowed roles
  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // Redirect to fallback path if role is not allowed
  return <Navigate to={fallbackPath} replace />;
};