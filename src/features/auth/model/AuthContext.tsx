import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User, RegisterPayload, VerifyEmailPayload } from '../api/auth.api';
import * as api from '../api/auth.api';
import { clearTokens, clearUser, getUser, hydrateMemoryFromStorage, setTokens, setUser as setStoredUser } from '../../../shared/api/secureStorage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
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
    // por defecto 15min (900s) - refresca 60s antes
    const sec = expiresInSec && expiresInSec > 70 ? expiresInSec - 60 : 840;
    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        await api.refreshApi().then((res) => {
          // actualiza storage silencioso sin disparar UI
          const current = getUser<User>();
          if (current) {
            const updated = { ...current, token: res.token, refreshToken: res.refreshToken ?? current.refreshToken };
            setStoredUser(updated);
            setTokens(res.token, res.refreshToken);
            setUser(updated);
            scheduleSilentRefresh(900);
          }
        });
      } catch {
        // si falla, el interceptor 401 ya limpiará sesión
        clearRefreshTimer();
      }
    }, sec * 1000);
  }, [clearRefreshTimer]);

  useEffect(() => {
    hydrateMemoryFromStorage();
    const parsed = getUser<User>();
    if (parsed?.email) {
      setUser(parsed);
      // si ya hay sesión, programa refresh silencioso
      scheduleSilentRefresh(900);
    }
    setIsInitializing(false);
    return () => clearRefreshTimer();
  }, [clearRefreshTimer, scheduleSilentRefresh]);

  // AC-004: si el refresh silencioso falla (401), cierra sesión automáticamente
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
      // schedule con expiresIn si viene (por defecto 15min)
      const expiresIn = (u as unknown as { expiresIn?: number }).expiresIn as number | undefined;
      scheduleSilentRefresh(expiresIn);
    } else {
      clearUser();
      clearTokens();
      clearRefreshTimer();
    }
  }, [scheduleSilentRefresh, clearRefreshTimer]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.loginApi(email, password);
    setUser(u);
    persist(u);
  }, [persist]);

  const register = useCallback(async (payload: RegisterPayload) => {
    // Crear una cuenta no equivale a autenticarla. El backend envía el correo
    // de confirmación en este paso y el usuario debe validarlo antes de poder
    // iniciar sesión.
    await api.registerApi(payload);
  }, []);

  const verifyEmail = useCallback(async (payload: VerifyEmailPayload) => {
    // payload ahora es { code: "123456" } con alias token para compatibilidad
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
    // actualiza solo token en usuario actual
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
    } catch { /* ignora error de red al desloguear */ }
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
