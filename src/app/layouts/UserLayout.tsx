import { ShellLayout, analyticsGroup, dashboardGroup, deviceGroup, eventsGroup, settingsGroup } from './ShellLayout';
import { paths } from '../router/paths';
import { useLang } from '../../shared/i18n/LanguageContext';

export function UserLayout() {
  const { t } = useLang();
  const dashboard = dashboardGroup(paths.user.dashboard);
  const analytics = analyticsGroup(paths.user.analytics);
  const device = deviceGroup(paths.user.device);
  const events = eventsGroup([
    { to: paths.user.events, label: t('menu.history') },
    { to: paths.user.alerts, label: t('menu.notifications') },
  ]);
  const settings = settingsGroup([
    { to: paths.user.account, label: t('menu.account') },
    { to: paths.user.security, label: t('menu.security') },
    { to: paths.user.preferences, label: t('menu.preferences') },
    { to: paths.user.help, label: t('menu.help') },
  ]);
  return (
    <ShellLayout
      menu={[
        { ...dashboard, title: t('menu.home') },
        { ...device, title: t('menu.monitoring') },
        { ...events, title: t('menu.events') },
        { ...analytics, title: t('menu.analytics') },
        { ...settings, title: t('menu.settings') },
      ]}
    />
  );
}
