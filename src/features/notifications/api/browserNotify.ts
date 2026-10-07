/**
 * Avisos nativos del navegador (Notification API) para HU-API-009.
 * Sin servidor push: el portal detecta novedades por polling y eleva
 * un `new Notification(...)` del SO. Requiere contexto seguro
 * (localhost o HTTPS); si no hay soporte, todo es no-op.
 */
import type { NotificationItem } from './notifications.api';

export type BrowserNotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';

const DISMISSED_KEY = 'sg-notif-perm-dismissed';

export function isBrowserNotifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotifyPermission(): BrowserNotifyPermission {
  if (!isBrowserNotifySupported()) return 'unsupported';
  return Notification.permission as BrowserNotifyPermission;
}

export async function requestBrowserNotifyPermission(): Promise<BrowserNotifyPermission> {
  if (!isBrowserNotifySupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result as BrowserNotifyPermission;
  } catch {
    return getBrowserNotifyPermission();
  }
}

export function isPermissionBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return true;
  }
}

export function dismissPermissionBanner(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // Sin storage: no se insiste en esta sesión.
  }
}

/** Eleva el aviso nativo del SO. El clic enfoca la app y pide abrir las alertas. */
export function showBrowserNotification(item: NotificationItem): void {
  if (!isBrowserNotifySupported()) return;
  if (Notification.permission !== 'granted') return;
  try {
    const notif = new Notification(item.title || 'SomnGuard', {
      body: item.message,
      tag: `somnguard-${item.id}`,
    });
    notif.onclick = () => {
      try {
        window.focus();
      } catch {
        // noop
      }
      window.dispatchEvent(new CustomEvent('sg:notifications-open'));
      notif.close();
    };
  } catch {
    // Permiso revocado a mitad de camino: se reintentará en el siguiente ciclo.
  }
}
