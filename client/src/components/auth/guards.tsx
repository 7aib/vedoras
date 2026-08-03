import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from './PageLoader';

/** Redirects unauthenticated visitors to the login page. */
export function RequireAuth() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

/** Keeps authenticated users away from login/register pages. */
export function GuestOnly() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
