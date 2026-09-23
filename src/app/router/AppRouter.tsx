import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { UserLayout } from '../layouts/UserLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
import { paths } from './paths';
import { VerifyEmailRoute, VerifyResetCodeRoute, ResetPasswordRoute } from './AuthFlowRoutes';
import { AdminDashboard } from '../../features/dashboard/ui/AdminDashboard';
import { UserDashboard } from '../../features/dashboard/ui/UserDashboard';
import { SecurityPage } from '../../features/security/ui/SecurityPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { useAuth } from '../../features/auth/model/AuthContext';
import { getHomeRoute } from './paths';

function HomeRoute() {
  const { user, isInitializing } = useAuth();
  if (isInitializing) return <div className="route-loading">Cargando sesión...</div>;
  if (user) return <Navigate to={getHomeRoute(user)} replace />;
  // Anónimo: PublicLayout ya muestra el Hero, no hay nada que renderizar aquí.
  return null;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path={paths.public.verifyEmail} element={<VerifyEmailRoute />} />
        <Route path={paths.public.verifyResetCode} element={<VerifyResetCodeRoute />} />
        <Route path={paths.public.resetPassword} element={<ResetPasswordRoute />} />
        <Route path={paths.public.home} element={<HomeRoute />} />
      </Route>

      <Route path={paths.forbidden} element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
          <Route path={paths.admin.root} element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="security" element={<SecurityPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole allowedRoles={['USER']} />}>
          <Route path={paths.user.root} element={<UserLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={paths.public.home} replace />} />
    </Routes>
  );
}
