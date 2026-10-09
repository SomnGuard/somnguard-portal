import { ShellLayout, adminDevicesGroup, dashboardGroup, eventsGroup, notificationsGroup, securityGroup } from './ShellLayout';
import { paths } from '../router/paths';

export function AdminLayout() {
  return (
    <ShellLayout
      menu={[
        dashboardGroup(paths.admin.dashboard),
        adminDevicesGroup([
          { to: paths.admin.deviceList, label: 'Inventario' },
          { to: paths.admin.deviceConfig, label: 'Configuración' },
        ]),
        eventsGroup([{ to: paths.admin.events, label: 'Historial' }]),
        notificationsGroup([{ to: paths.admin.notifications, label: 'Centro de avisos' }]),
        securityGroup([
          { to: paths.admin.securityRoles, label: 'Roles y permisos' },
          { to: paths.admin.catalogs, label: 'Catálogos' },
        ]),
      ]}
    />
  );
}
