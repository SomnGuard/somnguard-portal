import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User, RegisterPayload, VerifyEmailPayload } from '../api/auth.api';
import * as api from '../api/auth.api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<string>;
  forgot: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = 'somnguard_user';
const TOKEN_KEY = 'somnguard_token';
const REFRESH_KEY = 'somnguard_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: User = JSON.parse(raw);
        if (parsed?.email) setUser(parsed);
      }
    } catch { /* ignore */ }
    setIsInitializing(false);
  }, []);

  const persist = useCallback((u: User | null) => {
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      if (u.token) localStorage.setItem(TOKEN_KEY, u.token);
      if (u.refreshToken) localStorage.setItem(REFRESH_KEY, u.refreshToken);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  }, []);

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
    resetPassword,
    refresh,
    logout,
  }), [user, isInitializing, login, register, verifyEmail, forgot, resetPassword, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
