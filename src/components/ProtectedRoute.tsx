import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCompany?: boolean;
}

export const ProtectedRoute = ({ children, requireCompany = true }: ProtectedRouteProps) => {
  const { user, loading: authLoading, session } = useAuth();
  const { hasCompany, loading: companyLoading } = useCompany();
  const location = useLocation();
  
  const loading = authLoading || (requireCompany && companyLoading);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!session || !user) {
    // Redirect to login page, but save the current location they tried to access
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  
  // If the route requires company access and user doesn't have a company,
  // redirect to the company setup page
  if (requireCompany && !hasCompany && !location.pathname.startsWith('/company/setup')) {
    return <Navigate to="/company/setup" state={{ from: location }} replace />;
  }
  
  // If user has a company and tries to access setup page, redirect to dashboard
  if (hasCompany && location.pathname.startsWith('/company/setup')) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};
