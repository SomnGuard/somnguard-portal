import { ShellLayout, dashboardGroup, securityGroup } from './ShellLayout';
import { paths } from '../router/paths';

export function AdminLayout() {
  return (
    <ShellLayout
      menu={[
        dashboardGroup(paths.admin.dashboard),
        securityGroup([{ to: paths.admin.security, label: 'General' }]),
      ]}
    />
  );
}
