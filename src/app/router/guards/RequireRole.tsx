import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '../../../entities/user/model/types';
import { useAuth } from '../../../features/auth/model/AuthContext';
import { hasRole, paths } from '../paths';

export function RequireRole({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <div className="route-loading">Cargando sesión...</div>;

  if (!user) return <Navigate to={paths.public.home} replace state={{ from: location }} />;

  if (!hasRole(user, allowedRoles)) return <Navigate to={paths.forbidden} replace state={{ from: location }} />;

  return <Outlet />;
}
