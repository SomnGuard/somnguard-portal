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
} as const;

export const HTTP = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

export type HttpMethod = (typeof HTTP)[keyof typeof HTTP];
