import { parseApiError, logApiError } from './errors';

/**
 * httpRequest genérico - equivalente a Frontend-Job/assets/js/Services/api.js
 * Centraliza fetch, headers, token y manejo de errores/204
 * URL nunca hardcodeada: se recibe ya construida desde endpoints.ts (que usa VITE_API_URL)
 * Errores se lanzan como ApiError con {status, code, details, traceId} y se loguean con trace_id para soporte
 * sin exponer detalles técnicos al usuario.
 */

export async function httpRequest<T>(url: string, method: string, data: unknown = null): Promise<T> {
  const token = localStorage.getItem('somnguard_token');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (data !== null && data !== undefined) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorBody: unknown = await response.json().catch(() => ({}));
    const apiError = parseApiError(response.status, errorBody);
    logApiError(`httpRequest ${method} ${url} -> ${response.status}`, apiError);
    throw apiError;
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
