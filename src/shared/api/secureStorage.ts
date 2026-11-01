/**
 * Browser auth storage: access tokens stay in memory and refresh tokens live only
 * in the API's HttpOnly cookie. User profile metadata may be persisted separately.
 * Legacy token keys are deleted during hydration and are never read or written.
 */

let memoryToken: string | null = null;

const TOKEN_KEY = 'somnguard_token';
const REFRESH_KEY = 'somnguard_refresh_token';
const USER_KEY = 'somnguard_user';

function removeLegacyTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {}
}

function withoutTokens<T>(user: T): T {
  if (!user || typeof user !== 'object') return user;
  const safeUser = { ...(user as Record<string, unknown>) };
  delete safeUser.token;
  delete safeUser.refreshToken;
  return safeUser as T;
}

export function getAccessToken(): string | null {
  return memoryToken;
}

export function getRefreshToken(): string | null {
  return null;
}

export function setTokens(token?: string | null, _refreshToken?: string | null): void {
  if (token !== undefined) memoryToken = token || null;
  removeLegacyTokens();
}

export function clearTokens(): void {
  memoryToken = null;
  removeLegacyTokens();
}

export function getUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    const safeUser = withoutTokens(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(safeUser)) {
      localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
    }
    return safeUser;
  } catch {
    return null;
  }
}

export function setUser(user: unknown): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(withoutTokens(user)));
  } catch {}
}

export function clearUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function hydrateMemoryFromStorage(): void {
  memoryToken = null;
  removeLegacyTokens();
}
