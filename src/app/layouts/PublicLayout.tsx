import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Header } from '../../shared/ui/Header';
import { Footer } from '../../shared/ui/Footer';
import { AuthModals } from '../../features/auth/ui/AuthModals';
import { Hero } from '../../features/landing/ui/Hero';
import { useAuth } from '../../features/auth/model/AuthContext';
import { getHomeRoute, paths } from '../router/paths';
import type { RegisterPayload } from '../../features/auth/api/auth.api';

export function PublicLayout() {
  const { isAuthenticated, isInitializing, user, login, register, forgot, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [modal, setModal] = useState<'login' | 'register' | 'forgot' | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate(paths.public.home, { replace: true });
  };

  const handleLogin = async (email: string, password: string) => {
    const loggedUser = await login(email, password);
    navigate(getHomeRoute(loggedUser), { replace: true });
  };

  const handleRegister = async (payload: RegisterPayload) => {
    await register(payload);
    setModal(null);
    navigate(`${paths.public.verifyEmail}?email=${encodeURIComponent(payload.email)}`);
  };

  // Flujo recuperación con código de 6 dígitos (rama fix/function-reset-password):
  // solicitar código -> /verify-reset-code?email=... -> /reset-password?code=...&email=...
  const handleForgot = async (email: string) => {
    const msg = await forgot(email);
    setModal(null);
    navigate(`${paths.public.verifyResetCode}?email=${encodeURIComponent(email)}`);
    return msg;
  };

  const isAuthFlow =
    location.pathname === paths.public.verifyEmail ||
    location.pathname === paths.public.verifyResetCode ||
    location.pathname === paths.public.resetPassword;

  // Tras verificar email o restablecer contraseña se vuelve al inicio
  // con el modal de login abierto (antes lo hacía App.tsx con setModal).
  useEffect(() => {
    const state = location.state as { openLogin?: boolean } | null;
    if (state?.openLogin) {
      setModal('login');
      navigate(paths.public.home, { replace: true });
    }
  }, [location.state, navigate]);

  // Usuario ya autenticado en la landing ("/") -> enviar a su dashboard según rol.
  // Sin esto, el <Outlet /> de "/" (HomeRoute) nunca se renderizaba porque el layout
  // mostraba solo <Hero /> y el login quedaba "quemado" en la vista pública.
  if (!isInitializing && isAuthenticated && location.pathname === paths.public.home) {
    return <Navigate to={getHomeRoute(user)} replace />;
  }

  return (
    <div className="public-app">
      <Header isAuthenticated={isAuthenticated} onOpen={(m) => setModal(m)} onLogout={handleLogout} />
      {isAuthFlow ? <Outlet /> : <Hero />}
      <AuthModals
        open={modal}
        onClose={() => setModal(null)}
        onSwitch={(to) => setModal(to)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onForgot={handleForgot}
      />
      <Footer />
    </div>
  );
}
