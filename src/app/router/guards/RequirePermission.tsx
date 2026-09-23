import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../features/auth/model/AuthContext';
import { hasPermission, paths } from '../paths';

export function RequirePermission({ permission }: { permission: string }) {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <div className="route-loading">Cargando sesión...</div>;

  if (!user) return <Navigate to={paths.public.home} replace state={{ from: location }} />;
  if (!hasPermission(user, permission)) return <Navigate to={paths.forbidden} replace state={{ from: location }} />;

  return <Outlet />;
}
