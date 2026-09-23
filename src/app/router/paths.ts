import type { User, UserRole } from '../../entities/user/model/types';

export const paths = {
  public: {
    home: '/',
    login: '/',
    verifyEmail: '/verify-email',
    verifyResetCode: '/verify-reset-code',
    resetPassword: '/reset-password',
  },
  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    security: '/admin/security',
    securityUsers: '/admin/security/users',
    securityRoles: '/admin/security/roles',
    devices: '/admin/device-management',
    deviceList: '/admin/device-management/devices',
    deviceConfig: '/admin/device-management/configuration',
  },
  user: {
    root: '/user',
    dashboard: '/user/dashboard',
    device: '/user/my-device',
    alerts: '/user/my-alerts',
  },
  forbidden: '/403',
} as const;

export function getHomeRoute(user: User | null | undefined): string {
  if (!user) return paths.public.home;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (roles.includes('ADMIN')) return paths.admin.dashboard;
  if (roles.includes('USER')) return paths.user.dashboard;
  return paths.forbidden;
}

export function hasRole(user: User | null | undefined, allowed: readonly UserRole[]): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((role) => allowed.includes(role));
}

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(permission);
}
