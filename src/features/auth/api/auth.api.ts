/**
 * Auth API. El backend puede devolver el usuario con roles/permisos o solo tokens.
 * Cuando devuelve solo un JWT, intentamos extraer claims de acceso comunes.
 * La autorización real SIEMPRE debe validarse en backend.
 */
import { httpRequest } from '../../../shared/api/client';
import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { getRefreshToken } from '../../../shared/api/secureStorage';
import type { User, UserRole } from '../../../entities/user/model/types';

export type { User, UserRole } from '../../../entities/user/model/types';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface VerifyEmailPayload {
  code: string;
}

export interface AuthResponse {
  user?: Partial<User> & Record<string, unknown>;
  data?: AuthResponse & Partial<User> & Record<string, unknown>;
  result?: AuthResponse & Partial<User> & Record<string, unknown>;
  id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roles?: unknown;
  role?: unknown;
  rol?: unknown;
  authorities?: unknown;
  permissions?: unknown;
  perms?: unknown;
  features?: unknown;
  feautures?: unknown;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  tokenType?: string;
  expiresIn?: number;
  message?: string;
}

const ADMIN_PERMISSIONS = [
  'DASHBOARD_READ',
  'USER_READ',
  'USER_WRITE',
  'ROLE_READ',
  'ROLE_WRITE',
  'DEVICE_READ',
  'DEVICE_CONFIG',
  'ALERT_READ',
];

const USER_PERMISSIONS = ['DASHBOARD_READ', 'MY_DEVICE_READ', 'MY_ALERT_READ'];

/** Extrae el texto de rol desde string u objeto {authority|role|name|value}. */
function roleToString(role: unknown): string {
  if (typeof role === 'string' || typeof role === 'number') return String(role);
  if (role && typeof role === 'object') {
    const obj = role as Record<string, unknown>;
    const nested = obj.authority ?? obj.role ?? obj.name ?? obj.value ?? obj.rol;
    if (typeof nested === 'string' || typeof nested === 'number') return String(nested);
  }
  return '';
}

/** Mapea variantes comunes (ROLE_, minúsculas, ES) al UserRole canónico. */
function canonicalRole(raw: string): UserRole | null {
  const clean = raw
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  switch (clean) {
    case 'ADMIN':
    case 'ADMINISTRADOR':
    case 'ADMINISTRATOR':
    case 'ADMINISTRADORES':
      return 'ADMIN';
    case 'USER':
    case 'USUARIO':
    case 'USUARIOS':
    case 'CLIENT':
    case 'CLIENTE':
    case 'CLIENTES':
    case 'CUSTOMER':
      return 'USER';
    default:
      return null;
  }
}

function normalizeRoles(value: unknown): UserRole[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  // Soporta "ADMIN,USER" en un solo string.
  const flat: unknown[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item.includes(',')) flat.push(...item.split(','));
    else flat.push(item);
  }
  const mapped = flat.map((r) => canonicalRole(roleToString(r))).filter((r): r is UserRole => r !== null);
  return [...new Set(mapped)];
}

function permissionToString(permission: unknown): string {
  if (typeof permission === 'string' || typeof permission === 'number') return String(permission);
  if (permission && typeof permission === 'object') {
    const obj = permission as Record<string, unknown>;
    const nested = obj.authority ?? obj.permission ?? obj.name ?? obj.value ?? obj.perm;
    if (typeof nested === 'string' || typeof nested === 'number') return String(nested);
  }
  return '';
}

function normalizePermissions(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const flat: unknown[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item.includes(',')) flat.push(...item.split(','));
    else flat.push(item);
  }
  const mapped = flat.map((p) => permissionToString(p).trim()).filter(Boolean);
  return [...new Set(mapped)];
}

function decodeJwtPayload(token?: string): Record<string, unknown> {
  if (!token) return {};
  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Desenvuelve respuestas tipo {data:{user,token}}, {result:{...}} o planas.
 * Devuelve un objeto plano con user/token/roles/permissions mezclados.
 */
function unwrapAuthResponse(res: AuthResponse & Record<string, unknown>): Record<string, unknown> {
  const data = (res.data ?? res.result) as (AuthResponse & Record<string, unknown>) | undefined;
  const nestedUser = (res.user ?? data?.user) as (Partial<User> & Record<string, unknown>) | undefined;
  const flat: Record<string, unknown> = { ...data, ...res };
  if (nestedUser && typeof nestedUser === 'object') {
    for (const [key, value] of Object.entries(nestedUser)) {
      if (flat[key] === undefined) flat[key] = value;
    }
    flat.user = nestedUser;
  }
  return flat;
}

function pick<T>(...candidates: unknown[]): T | undefined {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && candidate !== '') return candidate as T;
  }
  return undefined;
}

/** Como pick, pero salta también arreglos vacíos (no bloquean el fallback al JWT). */
function firstNonEmpty(...candidates: unknown[]): unknown {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') continue;
    if (Array.isArray(candidate) && candidate.length === 0) continue;
    return candidate;
  }
  return undefined;
}

/**
 * Convierte un feature del backend ("user.read", "device.config_read")
 * al vocabulario de permisos del frontend ("USER_READ", "DEVICE_CONFIG_READ").
 */
function featureToPermission(feature: string): string {
  return feature.trim().toUpperCase().replace(/[.\-]+/g, '_');
}

export function normalizeUser(
  source: Partial<User> & Record<string, unknown>,
  fallbackEmail = '',
  token?: string,
  refreshToken?: string,
): User {
  const jwt = decodeJwtPayload(token);
  const nestedRealmRoles =
    typeof jwt.realm_access === 'object' && jwt.realm_access !== null
      ? (jwt.realm_access as { roles?: unknown }).roles
      : undefined;

  const roles = normalizeRoles(
    firstNonEmpty(
      source.roles,
      source.role,
      source.rol,
      source.authorities,
      (source.user as Record<string, unknown> | undefined)?.roles,
      jwt.roles,
      jwt.role,
      jwt.authorities,
      jwt.rol,
      nestedRealmRoles,
    ),
  );

  // El backend manda los permisos en "feautures" (así, con typo) o "features"
  // con notación de puntos ("user.read"). Se mapean al vocabulario del
  // frontend ("USER_READ") y se unen con los permisos base del rol para que
  // la navegación por rol nunca quede bloqueada. El backend sigue siendo
  // la autoridad real en cada API.
  const rawPermissions = firstNonEmpty(
    source.permissions,
    source.perms,
    (source as Record<string, unknown>).features,
    (source as Record<string, unknown>).feautures,
    source.authorities,
    jwt.permissions,
    jwt.perms,
    (jwt as Record<string, unknown>).features,
    (jwt as Record<string, unknown>).feautures,
    (jwt.scope as unknown) ?? (jwt.scp as unknown),
    jwt.scopes,
  );
  const mapped = normalizePermissions(rawPermissions).map(featureToPermission);
  const base = roles.includes('ADMIN')
    ? ADMIN_PERMISSIONS
    : roles.includes('USER')
      ? USER_PERMISSIONS
      : [];
  const aliases: string[] = [];
  if (mapped.includes('DEVICE_CONFIG_READ') || mapped.includes('DEVICE_CONFIG_WRITE')) {
    aliases.push('DEVICE_CONFIG');
  }
  const permissions = [...new Set([...mapped, ...base, ...aliases])];

  const nested = (source.user ?? {}) as Record<string, unknown>;
  const firstName = pick<string>(source.firstName, nested.firstName);
  const lastName = pick<string>(source.lastName, nested.lastName);

  const id = pick<string>(source.id, nested.id, typeof jwt.sub === 'string' ? jwt.sub : undefined);
  const name =
    pick<string>(source.name, nested.name) ??
    ([firstName, lastName].filter(Boolean).join(' ') || undefined) ??
    (fallbackEmail.split('@')[0] || 'Usuario');
  const email = pick<string>(source.email, nested.email, fallbackEmail) ?? fallbackEmail;
  const phone = pick<string>(source.phone, nested.phone);

  return {
    id,
    name,
    firstName,
    lastName,
    email,
    phone,
    roles,
    permissions,
    token,
    refreshToken,
  };
}

function toUserFromResponse(
  res: AuthResponse & Record<string, unknown>,
  fallbackEmail: string,
): User {
  const flat = unwrapAuthResponse(res);
  const nestedUser = (flat.user ?? {}) as Partial<User> & Record<string, unknown>;
  // El backend usa snake_case: access_token / refresh_token.
  const token =
    (nestedUser.token as string | undefined) ??
    (nestedUser.accessToken as string | undefined) ??
    (nestedUser.access_token as string | undefined) ??
    (flat.accessToken as string | undefined) ??
    (flat.access_token as string | undefined) ??
    (flat.token as string | undefined);
  const refreshToken =
    (nestedUser.refreshToken as string | undefined) ??
    (nestedUser.refresh_token as string | undefined) ??
    (flat.refreshToken as string | undefined) ??
    (flat.refresh_token as string | undefined);
  const source: Partial<User> & Record<string, unknown> = {
    ...flat,
    ...nestedUser,
    email: (nestedUser.email ?? flat.email ?? fallbackEmail) as string,
    user: nestedUser,
  };
  const user = normalizeUser(source, fallbackEmail, token, refreshToken);
  console.log('[auth] login response', {
    keys: Object.keys(res ?? {}),
    hasToken: !!token,
    roles: user.roles,
    permissions: user.permissions,
    email: user.email,
  });
  return user;
}

export async function loginApi(email: string, password: string): Promise<User> {
  const res = await httpRequest<AuthResponse>(endpoints.auth.login, HTTP.POST, { email, password });
  return toUserFromResponse(res as AuthResponse & Record<string, unknown>, email);
}

export async function registerApi(payload: RegisterPayload): Promise<User> {
  const res = await httpRequest<AuthResponse>(endpoints.auth.register, HTTP.POST, payload);
  return toUserFromResponse(res as AuthResponse & Record<string, unknown>, payload.email);
}

export async function verifyEmailApi(payload: VerifyEmailPayload): Promise<{ message: string }> {
  return httpRequest<{ message: string }>(endpoints.auth.verifyEmail, HTTP.POST, { code: payload.code });
}

// POST /api/v1/auth/forgot-password { email } -> { message }
export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  return httpRequest<{ message: string }>(endpoints.auth.forgot, HTTP.POST, { email });
}

// POST /api/v1/auth/verify-reset-code { code: "147782" } -> { message }
// Backend acepta alias token/code, solo valida (no consume). 400 si inválido/expirado
export async function verifyResetCodeApi(code: string): Promise<{ message: string }> {
  return httpRequest<{ message: string }>(endpoints.auth.verifyResetCode, HTTP.POST, { code });
}

// POST /api/v1/auth/refresh { refreshToken } -> LoginResponse { accessToken, refreshToken }
// Soporta httpOnly: si no hay refreshToken en storage, envía {} y el backend lo lee de la cookie (credentials:include)
export async function refreshApi(): Promise<{ token: string; refreshToken?: string }> {
  const refreshToken = getRefreshToken();
  // El backend usa snake_case (como en el login: access_token/refresh_token).
  const body = refreshToken ? { refresh_token: refreshToken } : {};
  const res = await httpRequest<{ accessToken?: string; access_token?: string; token?: string; refreshToken?: string; refresh_token?: string }>(endpoints.auth.refresh, HTTP.POST, body);
  const token = res.accessToken ?? res.access_token ?? res.token ?? '';
  const newRefresh = res.refreshToken ?? res.refresh_token;
  return { token, refreshToken: newRefresh };
}

export async function logoutApi(): Promise<void> {
  const refreshToken = getRefreshToken();
  const body = refreshToken ? { refresh_token: refreshToken } : {};
  await httpRequest<void>(endpoints.auth.logout, HTTP.POST, body);
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export async function resetPasswordApi(payload: ResetPasswordPayload): Promise<{ message: string }> {
  return httpRequest<{ message: string }>(endpoints.auth.resetPassword, HTTP.POST, {
    token: payload.token,
    newPassword: payload.newPassword,
  });
}
