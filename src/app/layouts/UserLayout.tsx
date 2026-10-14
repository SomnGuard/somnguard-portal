import { ShellLayout, analyticsGroup, dashboardGroup, eventsGroup, preferencesGroup, deviceGroup } from './ShellLayout';
import { paths } from '../router/paths';

export function UserLayout() {
  return (
    <ShellLayout
      menu={[
        dashboardGroup(paths.user.dashboard),
        analyticsGroup(paths.user.analytics),
        deviceGroup(paths.user.device),
        eventsGroup([
          { to: paths.user.events, label: 'Historial' },
          { to: paths.user.alerts, label: 'Notificaciones' },
        ]),
        preferencesGroup(paths.user.preferences),
      ]}
    />
  );
}
