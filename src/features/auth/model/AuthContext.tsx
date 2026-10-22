import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User, RegisterPayload, VerifyEmailPayload } from '../api/auth.api';
import * as api from '../api/auth.api';
import { clearTokens, clearUser, getUser, hydrateMemoryFromStorage, setTokens, setUser as setStoredUser } from '../../../shared/api/secureStorage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<string>;
  forgot: (email: string) => Promise<string>;
  verifyResetCode: (code: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleSilentRefresh = useCallback((expiresInSec?: number) => {
    clearRefreshTimer();
    const sec = expiresInSec && expiresInSec > 70 ? expiresInSec - 60 : 840;
    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        await api.refreshApi().then((res) => {
          const current = getUser<User>();
          if (current && res.token) {
            const updated = { ...current, token: res.token, refreshToken: res.refreshToken ?? current.refreshToken };
            setStoredUser(updated);
            setTokens(res.token, res.refreshToken);
            setUser(updated);
            scheduleSilentRefresh(900);
          }
        });
      } catch {
        clearRefreshTimer();
      }
    }, sec * 1000);
  }, [clearRefreshTimer]);

  useEffect(() => {
    hydrateMemoryFromStorage();
    const parsed = getUser<User>();
    if (parsed?.email) {
      const restored: User = {
        ...parsed,
        name: parsed.name ?? parsed.email.split('@')[0],
        roles: Array.isArray(parsed.roles) ? parsed.roles : [],
        permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
      };
      setUser(restored);
      if (restored.token || restored.refreshToken) scheduleSilentRefresh(900);
    }
    setIsInitializing(false);
    return () => clearRefreshTimer();
  }, [clearRefreshTimer, scheduleSilentRefresh]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      clearUser();
      clearTokens();
      clearRefreshTimer();
    };
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, [clearRefreshTimer]);

  const persist = useCallback((u: User | null) => {
    if (u) {
      setStoredUser(u);
      setTokens(u.token ?? null, u.refreshToken ?? null);
      if (u.token || u.refreshToken) scheduleSilentRefresh(900);
    } else {
      clearUser();
      clearTokens();
      clearRefreshTimer();
    }
  }, [scheduleSilentRefresh, clearRefreshTimer]);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const u = await api.loginApi(email, password);
    setUser(u);
    persist(u);
    return u;
  }, [persist]);



  const register = useCallback(async (payload: RegisterPayload) => {
    await api.registerApi(payload);
  }, []);

  const verifyEmail = useCallback(async (payload: VerifyEmailPayload) => {
    const res = await api.verifyEmailApi(payload);
    return res.message;
  }, []);

  const forgot = useCallback(async (email: string) => {
    const res = await api.forgotPasswordApi(email);
    return res.message;
  }, []);

  const verifyResetCode = useCallback(async (code: string) => {
    const res = await api.verifyResetCodeApi(code);
    return res.message;
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const res = await api.resetPasswordApi({ token, newPassword });
    return res.message;
  }, []);

  const refresh = useCallback(async () => {
    const res = await api.refreshApi();
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, token: res.token, refreshToken: res.refreshToken ?? prev.refreshToken };
      persist(updated);
      return updated;
    });
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      await api.logoutApi();
    } catch {
      // logout local aun si el backend no responde
    }
    setUser(null);
    persist(null);
  }, [persist]);

  const value = useMemo<AuthState>(() => ({
    user,
    isAuthenticated: !!user,
    isInitializing,
    login,
    register,
    verifyEmail,
    forgot,
    verifyResetCode,
    resetPassword,
    refresh,
    logout,
  }), [user, isInitializing, login, register, verifyEmail, forgot, verifyResetCode, resetPassword, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
