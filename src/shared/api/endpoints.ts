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
  },
  
} as const;

export const HTTP = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

export type HttpMethod = (typeof HTTP)[keyof typeof HTTP];
