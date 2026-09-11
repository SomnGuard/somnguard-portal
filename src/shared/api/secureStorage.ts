/**
 * Secure storage abstraction para AC-004
 * Objetivo: httpOnly cookies (backend Set-Cookie) > memory > localStorage fallback
 * - httpOnly no es legible desde JS: se usa credentials:'include' y el navegador envía cookies auto
 * - accessToken en memoria (no persiste en disco) reduce XSS; refreshToken ideal httpOnly
 * - Fallback localStorage solo hasta que backend migre a cookies
 */

let memoryToken: string | null = null;
let memoryRefresh: string | null = null;

const TOKEN_KEY = 'somnguard_token';
const REFRESH_KEY = 'somnguard_refresh_token';
const USER_KEY = 'somnguard_user';

export function getAccessToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (memoryRefresh) return memoryRefresh;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(token?: string | null, refreshToken?: string | null): void {
  if (token !== undefined) {
    memoryToken = token || null;
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }
  if (refreshToken !== undefined) {
    memoryRefresh = refreshToken || null;
    try {
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      else localStorage.removeItem(REFRESH_KEY);
    } catch {}
  }
}

export function clearTokens(): void {
  memoryToken = null;
  memoryRefresh = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

export function getUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setUser(user: unknown): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function hydrateMemoryFromStorage(): void {
  try {
    memoryToken = localStorage.getItem(TOKEN_KEY);
    memoryRefresh = localStorage.getItem(REFRESH_KEY);
  } catch {}
}
