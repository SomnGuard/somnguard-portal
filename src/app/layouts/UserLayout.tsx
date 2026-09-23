import { ShellLayout, dashboardGroup } from './ShellLayout';
import { paths } from '../router/paths';

export function UserLayout() {
  return <ShellLayout menu={[dashboardGroup(paths.user.dashboard)]} />;
}
