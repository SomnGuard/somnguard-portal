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
import { MyAlertsPage } from '../../features/user-alerts/ui/MyAlertsPage';
import { MyEventsPage } from '../../features/user-events/ui/MyEventsPage';
import { MyDevicePage } from '../../features/user-device/ui/MyDevicePage';
import { NotificationPreferencesPage } from '../../features/user-alerts/ui/NotificationPreferencesPage';
import { SecurityPage } from '../../features/security/ui/SecurityPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { useAuth } from '../../features/auth/model/AuthContext';
import { getHomeRoute } from './paths';
import { DeviceManagementPage } from '../../features/device-management/ui/DeviceManagementPage';
import { DeviceListPage } from '../../features/device-management/ui/DeviceListPage';
import { DeviceConfigPage } from '../../features/device-management/ui/DeviceConfigPage';
import { RequirePermission } from './guards/RequirePermission';
import { RolesPage } from '../../features/security/ui/RolesPage';
import { CatalogsPage } from '../../features/security/ui/CatalogsPage';
import { AdminEventsPage } from '../../features/user-events/ui/AdminEventsPage';
import { AdminNotificationsPage } from '../../features/notifications/ui/AdminNotificationsPage';

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
            <Route path="security" element={<SecurityPage />}>
              <Route index element={<Navigate to="roles" replace />} />
              <Route element={<RequirePermission permission="ROLE_READ" />}>
                <Route path="roles" element={<RolesPage />} />
              </Route>
              <Route path="catalogs" element={<CatalogsPage />} />
            </Route>
            <Route element={<RequirePermission permission="ALERT_READ" />}>
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
            </Route>
            <Route element={<RequirePermission permission="DEVICE_READ" />}>
              <Route path="device-management" element={<DeviceManagementPage />}>
                <Route index element={<Navigate to="devices" replace />} />
                <Route path="devices" element={<DeviceListPage />} />
                <Route element={<RequirePermission permission="DEVICE_CONFIG" />}>
                  <Route path="configuration" element={<DeviceConfigPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Route>

        <Route element={<RequireRole allowedRoles={['USER']} />}>
          <Route path={paths.user.root} element={<UserLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="monitoreo" element={<MyDevicePage />} />
            <Route path="my-alerts" element={<MyAlertsPage />} />
            <Route path="my-events" element={<MyEventsPage />} />
            <Route path="preferences" element={<NotificationPreferencesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={paths.public.home} replace />} />
    </Routes>
  );
}
