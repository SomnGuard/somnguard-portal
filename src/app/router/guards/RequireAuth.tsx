import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/AuthContext';
import { paths } from '../paths';

export function RequireAuth() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <div className="route-loading">Cargando sesión...</div>;

  if (!isAuthenticated) {
    return <Navigate to={paths.public.home} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
