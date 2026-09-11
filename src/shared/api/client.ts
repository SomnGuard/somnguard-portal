import { parseApiError, logApiError } from './errors';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './secureStorage';
import { endpoints } from './endpoints';

/**
 * httpRequest genérico - equivalente a Frontend-Job/assets/js/Services/api.js
 * Centraliza fetch, headers, token y manejo de errores/204
 * URL nunca hardcodeada: se recibe ya construida desde endpoints.ts (que usa VITE_API_URL)
 * Errores se lanzan como ApiError con {status, code, details, traceId} y se loguean con trace_id para soporte
 * sin exponer detalles técnicos al usuario.
 * AC-004: soporte httpOnly cookies (credentials:include) + refresh silencioso automático en 401
 */

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void; url: string; method: string; data: unknown }> = [];

function processQueue(error: unknown): void {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else {
      // reintenta la petición original con nuevo token
      httpRequest(p.url, p.method, p.data).then(p.resolve).catch(p.reject);
    }
  });
  failedQueue = [];
}

async function silentRefresh(): Promise<string | null> {
  if (isRefreshing) return null;
  isRefreshing = true;
  try {
    const refreshToken = getRefreshToken();
    // Si backend usa httpOnly cookies, el refresh va sin body y con credentials
    const body = refreshToken ? { refreshToken } : {};
    const res = await fetch(endpoints.auth.refresh, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`refresh ${res.status}`);
    if (res.status === 204) return null;
    const data = (await res.json().catch(() => ({}))) as { accessToken?: string; token?: string; refreshToken?: string; refresh_token?: string };
    const newAccess = data.accessToken ?? data.token ?? null;
    const newRefresh = data.refreshToken ?? data.refresh_token ?? null;
    if (newAccess || newRefresh) setTokens(newAccess ?? getAccessToken(), newRefresh ?? getRefreshToken());
    return newAccess;
  } catch {
    clearTokens();
    try {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    } catch {}
    return null;
  } finally {
    isRefreshing = false;
  }
}

export async function httpRequest<T>(url: string, method: string, data: unknown = null, _retry = true): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  if (data !== null && data !== undefined) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => ({}));
    const apiError = parseApiError(response.status, errorBody);
    logApiError(`httpRequest ${method} ${url} -> ${response.status}`, apiError);

    // AC-004 refresh silencioso: si 401 y no es /login ni /refresh, intenta renovar y reintenta una vez
    const isAuthUrl = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register');
    if (apiError.status === 401 && _retry && !isAuthUrl) {
      if (isRefreshing) {
        // encola y espera al refresh en curso
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({ resolve: resolve as (v: unknown) => void, reject, url, method, data });
        });
      }

      const newToken = await silentRefresh();
      if (newToken) {
        processQueue(null);
        // reintenta original con nuevo token, sin volver a entrar en loop
        return httpRequest<T>(url, method, data, false);
      } else {
        processQueue(apiError);
        // refresh falló: limpia sesión (el contexto hará redirect a login)
        // no reintenta
      }
    }

    throw apiError;
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
