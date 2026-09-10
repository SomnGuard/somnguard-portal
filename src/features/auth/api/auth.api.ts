/**
 * Service Auth - mapeado 1:1 a auth-controller del backend
 * Cada función usa httpRequest + endpoints + HTTP (patrón product.js)
 * URL base viene de .env via endpoints.ts, nunca hardcodeada
 */
import { httpRequest } from '../../../shared/api/client';
import { endpoints, HTTP } from '../../../shared/api/endpoints';

export interface User {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  token?: string;
  refreshToken?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface VerifyEmailPayload {
  code: string; // backend nuevo: 6 dígitos, alias token para compatibilidad
}

export interface AuthResponse {
  user?: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  refresh_token?: string;
  tokenType?: string;
  expiresIn?: number;
  message?: string;
}

// POST /api/v1/auth/login { email, password } -> LoginResponse { accessToken, refreshToken, tokenType, expiresIn }
// El backend NO devuelve user, así que construimos User mínimo con el email del login
export async function loginApi(email: string, password: string): Promise<User> {
  const res = await httpRequest<AuthResponse>(endpoints.auth.login, HTTP.POST, { email, password });
  // normaliza respuesta: backend puede devolver { token, user } o directo User
  if ((res as User).email) return res as unknown as User;
  if (res.user) return { ...res.user, token: res.token ?? res.accessToken, refreshToken: res.refreshToken ?? res.refresh_token };
  const token = res.accessToken ?? res.token;
  const refreshToken = res.refreshToken ?? res.refresh_token;
  // si viene LoginResponse puro, fabricamos User para el Dashboard
  if (token || refreshToken) {
    return { email, name: email.split('@')[0], token, refreshToken };
  }
  return res as unknown as User;
}

// POST /api/v1/auth/register { firstName, lastName, email, phone, password } -> User
export async function registerApi(payload: RegisterPayload): Promise<User> {
  
  const res = await httpRequest<AuthResponse>(endpoints.auth.register, HTTP.POST, payload);
  if ((res as User).email) return res as unknown as User;
  if (res.user) return { ...res.user, token: res.token, refreshToken: res.refreshToken };
  return res as unknown as User;
}

// POST /api/v1/auth/verify-email { code: "483921" } -> { message }
// Backend: VerifyEmailRequest @Pattern ^\d{6}$ @JsonAlias token/code, expira 15min
export async function verifyEmailApi(payload: VerifyEmailPayload): Promise<{ message: string }> {
  return httpRequest<{ message: string }>(endpoints.auth.verifyEmail, HTTP.POST, { code: payload.code });
}

// POST /api/v1/auth/forgot { email } -> { message } (legacy, si no existe en tu backend usa verifyEmail)
export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  return httpRequest<{ message: string }>(endpoints.auth.forgot, HTTP.POST, { email });
}

// POST /api/v1/auth/refresh { refreshToken } -> LoginResponse { accessToken, refreshToken }
export async function refreshApi(): Promise<{ token: string; refreshToken?: string }> {
  const refreshToken = localStorage.getItem('somnguard_refresh_token');
  if (!refreshToken) throw new Error('No hay refreshToken para refrescar sesión');
  const res = await httpRequest<{ accessToken?: string; token?: string; refreshToken?: string; refresh_token?: string }>(endpoints.auth.refresh, HTTP.POST, { refreshToken });
  const token = res.accessToken ?? res.token ?? '';
  const newRefresh = res.refreshToken ?? res.refresh_token;
  return { token, refreshToken: newRefresh };
}

// POST /api/v1/auth/logout { refreshToken } -> 204
// Si no hay refreshToken, es idempotente: no llama al backend para evitar 400 VALIDATION_ERROR ( @NotBlank )
export async function logoutApi(): Promise<void> {
  const refreshToken = localStorage.getItem('somnguard_refresh_token');
  if (!refreshToken) return;
  await httpRequest<void>(endpoints.auth.logout, HTTP.POST, { refreshToken });
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

// POST /api/v1/auth/reset-password { token, newPassword } -> { message }
// También acepta new_password via @JsonAlias
export async function resetPasswordApi(payload: ResetPasswordPayload): Promise<{ message: string }> {
  return httpRequest<{ message: string }>(endpoints.auth.resetPassword, HTTP.POST, {
    token: payload.token,
    newPassword: payload.newPassword,
  });
}
