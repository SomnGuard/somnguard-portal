import { useState } from 'react';
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

  const isAuthFlow = location.pathname === paths.public.verifyEmail || location.pathname === paths.public.resetPassword;

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
        onForgot={forgot}
      />
      <Footer />
    </div>
  );
}
