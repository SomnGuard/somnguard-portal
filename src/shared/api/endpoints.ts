/**
 * Endpoints centralizados - equivalente a Frontend-Job/assets/js/Services/conts.js
 * urlBase se toma de .env (VITE_API_URL) y nunca se hardcodea en el código
 * Sincronizado con auth-controller del backend
 */

const urlBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

// si no hay VITE_API_URL en producción, httpRequest lanzará error al usarlo
if (!urlBase) {
  console.warn('[endpoints] VITE_API_URL no definido en .env');
}

function deriveHealthUrl(base: string): string {
  if (!base) return '';
  // VITE_API_URL=http://host:8080/api/v1 -> http://host:8080/actuator/health
  return base.replace(/\/api\/v1\/?$/, '') + '/actuator/health';
}

function deriveWsUrl(): string {
  const explicit = import.meta.env.VITE_STREAM_WS_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');
  if (!urlBase) return '';
  try {
    const u = new URL(urlBase);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/ws/stream`;
  } catch {
    return '';
  }
}

export const endpoints = {
  auth: {
    verifyEmail: `${urlBase}/auth/verify-email`,
    register: `${urlBase}/auth/register`,
    refresh: `${urlBase}/auth/refresh`,
    logout: `${urlBase}/auth/logout`,
    login: `${urlBase}/auth/login`,
    forgotPassword: `${urlBase}/auth/forgot-password`,
    resetPassword: `${urlBase}/auth/reset-password`,
    forgot: `${urlBase}/auth/forgot-password`,
    verifyResetCode: `${urlBase}/auth/verify-reset-code`,
  },
  stream: {
    start: (deviceId: string) => `${urlBase}/devices/${deviceId}/stream/start`,
    stop: (deviceId: string) => `${urlBase}/devices/${deviceId}/stream/stop`,
    session: (deviceId: string) => `${urlBase}/devices/${deviceId}/stream/session`,
    detection: (deviceId: string) => `${urlBase}/devices/${deviceId}/stream/detection`,
    device: (deviceId: string) => `${urlBase}/devices/${deviceId}`,
    health: deriveHealthUrl(urlBase),
    ws: deriveWsUrl(),
  },
  notifications: {
    list: (page = 1, pageSize = 20) => `${urlBase}/notifications?page=${page}&page_size=${pageSize}`,
    unreadCount: `${urlBase}/notifications/unread-count`,
    delivered: (id: string) => `${urlBase}/notifications/${id}/delivered`,
    read: (id: string) => `${urlBase}/notifications/${id}/read`,
    deviceTokens: `${urlBase}/notifications/device-tokens`,
    preferences: `${urlBase}/users/me/notification-preferences`,
    retry: `${urlBase}/notifications/retry`,
  },
  events: {
    list: (params: { severity?: string; from?: string; to?: string; page?: number; pageSize?: number }) => {
      const q = new URLSearchParams();
      if (params.severity) q.set('severity', params.severity);
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      q.set('page', String(params.page ?? 1));
      q.set('page_size', String(params.pageSize ?? 20));
      return `${urlBase}/events?${q.toString()}`;
    },
    evidence: (eventId: string) => `${urlBase}/events/${encodeURIComponent(eventId)}/evidence`,
  },
  devices: {
    list: (params: { status?: string; assignedFrom?: string; assignedTo?: string; page?: number; pageSize?: number }) => {
      const q = new URLSearchParams();
      if (params.status) q.set('status', params.status);
      if (params.assignedFrom) q.set('assigned_from', params.assignedFrom);
      if (params.assignedTo) q.set('assigned_to', params.assignedTo);
      q.set('page', String(params.page ?? 1));
      q.set('page_size', String(params.pageSize ?? 20));
      return `${urlBase}/devices?${q.toString()}`;
    },
    create: `${urlBase}/devices`,
    detail: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}`,
    update: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}`,
    assign: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}/assign`,
    unassign: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}/unassign`,
    claim: `${urlBase}/devices/claim`,
    rotateKey: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}/rotate-key`,
    provisioningTokens: `${urlBase}/devices/provisioning-tokens`,
    config: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}/config`,
    configStatus: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}/config/status`,
    configRefresh: (id: string) => `${urlBase}/devices/${encodeURIComponent(id)}/config/refresh`,
  },
  admin: {
    roles: `${urlBase}/roles`,
    role: (id: string) => `${urlBase}/roles/${encodeURIComponent(id)}`,
    features: `${urlBase}/features`,
    feature: (id: string) => `${urlBase}/features/${encodeURIComponent(id)}`,
    modules: `${urlBase}/modules`,
    moduleFeatures: (id: string) => `${urlBase}/modules/${encodeURIComponent(id)}/features`,
    roleFeatures: `${urlBase}/role-features`,
    roleFeature: (id: string) => `${urlBase}/role-features/${encodeURIComponent(id)}`,
    userRoles: (id: string) => `${urlBase}/users/${encodeURIComponent(id)}/roles`,
    userRole: (userId: string, roleId: string) => `${urlBase}/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
  },
  catalogs: {
    list: (catalog: string) => `${urlBase}/catalogs/${catalog}`,
    item: (catalog: string, id: string) => `${urlBase}/catalogs/${catalog}/${encodeURIComponent(id)}`,
  },
} as const;

export const HTTP = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

export type HttpMethod = (typeof HTTP)[keyof typeof HTTP];
