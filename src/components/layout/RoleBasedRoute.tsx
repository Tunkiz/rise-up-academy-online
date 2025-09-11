import { useAuth } from "@/contexts/AuthProvider";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'teacher' | 'tutor' | 'student')[];
  fallbackPath?: string;
}

export const RoleBasedRoute = ({ 
  children, 
  allowedRoles, 
  fallbackPath 
}: RoleBasedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user's role is in allowed roles
  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // Determine fallback path based on user role if not specified
  let defaultFallback = "/dashboard";
  if (userRole === 'student') {
    defaultFallback = "/learning-portal";
  } else if (userRole === 'teacher' || userRole === 'tutor') {
    defaultFallback = "/admin";
  }

  // Redirect to fallback path if role is not allowed
  return <Navigate to={fallbackPath || defaultFallback} replace />;
};