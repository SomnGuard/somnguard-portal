import { useEffect, useState } from 'react';
import { Header } from '../shared/ui/Header';
import { Hero } from '../features/landing/ui/Hero';
import { Dashboard } from '../features/dashboard/ui/Dashboard';
import { AuthModals } from '../features/auth/ui/AuthModals';
import { VerifyEmailPage } from '../features/auth/ui/VerifyEmailPage';
import { ResetPasswordPage } from '../features/auth/ui/ResetPasswordPage';
import { Footer } from '../shared/ui/Footer';
import { useAuth } from '../features/auth/model/AuthContext';
import { useSoloLogoAnimation } from '../shared/hooks/useSoloLogoAnimation';

type ModalType = 'login' | 'register' | 'forgot' | null;

export default function App() {
  const { user, isAuthenticated, login, register, forgot, verifyEmail, resetPassword, logout } = useAuth();
  const [modal, setModal] = useState<ModalType>(null);
  // Pantalla completa obligatoria para verificar email (reemplaza al modal)
  const [verifyScreen, setVerifyScreen] = useState<{ email: string } | null>(null);
  // Pantalla completa para reset-password { token? } (consume POST /auth/reset-password)
  const [resetScreen, setResetScreen] = useState<{ token: string } | null>(null);

  // Solo el logo del cuerpo (hero) se anima; el header es estático
  useSoloLogoAnimation('heroLogo');

  // Recuperación via link: /reset-password?token=... (spec) — token largo vía MimeMessage
  // Soporta BrowserRouter y HashRouter, no limpia query hasta que ResetPasswordPage lo haya consumido
  useEffect(() => {
    const getTokenFromUrl = (): string | null => {
      // 1) ?token= en search normal
      const search = new URLSearchParams(window.location.search);
      let t = search.get('token') || search.get('resetToken') || search.get('reset_token');
      if (t) return t;
      // 2) HashRouter: /#/reset-password?token=... -> token en hash
      if (window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1] || '';
        const hashParams = new URLSearchParams(hashQuery);
        t = hashParams.get('token') || hashParams.get('resetToken') || hashParams.get('reset_token');
        if (t) return t;
      }
      // 3) Fallback: hash con token directo sin ?
      return null;
    };

    const t = getTokenFromUrl();
    const isResetRoute = window.location.pathname.includes('reset-password') || window.location.hash.includes('reset-password');
    const alreadyOpen = !!resetScreen;

    if (t && !alreadyOpen) {
      setResetScreen({ token: t });
      // NO limpiar query aquí: lo hace ResetPasswordPage tras montar para no perderlo
    } else if (isResetRoute && !t && !alreadyOpen && !isAuthenticated) {
      // Solo mostrar error si realmente estamos en /reset-password sin token y no hay token previo
      // Pequeño delay para no competir con el caso donde el token sí viene pero aún no se leyó
      if (!window.location.search && !window.location.hash.includes('token')) {
        setResetScreen({ token: '' });
      }
    }
  }, [isAuthenticated, resetScreen]);

  useEffect(() => {
    if (isAuthenticated && !verifyScreen && !resetScreen) {
      setTimeout(() => {
        document.getElementById('dashboardStatsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [isAuthenticated, verifyScreen, resetScreen]);

  const openModal = (m: Exclude<ModalType, null>) => setModal(m);
  const closeModal = () => setModal(null);
  const switchModal = (to: Exclude<ModalType, null>) => {
    setModal(null);
    setTimeout(() => setModal(to), 180);
  };

  const handleLogout = async () => {
    await logout();
    setVerifyScreen(null);
    setResetScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Wrapper de register que activa la pantalla completa de verificación (obligatoria)
  const handleRegister = async (payload: { firstName: string; lastName: string; email: string; phone: string; password: string }) => {
    await register(payload);
    // tras registro, forzar verificación en pantalla completa con email obligatorio
    setVerifyScreen({ email: payload.email });
    setModal(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVerify = async (code: string) => {
    await verifyEmail({ code });
  };

  const handleVerifySuccess = () => {
    setVerifyScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // si ya está autenticado tras registro, el Dashboard se mostrará automáticamente
    // si no, ofrecer login
    if (!isAuthenticated) {
      setTimeout(() => setModal('login'), 300);
    }
  };

  const handleVerifyBack = () => {
    setVerifyScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = async (token: string, newPassword: string) => {
    await resetPassword(token, newPassword);
  };

  const handleResetSuccess = () => {
    setResetScreen(null);
    // salir de /reset-password -> home para evitar que el useEffect reabra "enlace no válido"
    window.history.replaceState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setModal('login'), 300);
  };

  const handleResetBack = () => {
    setResetScreen(null);
    window.history.replaceState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Si hay reset-password pendiente, mostrar pantalla completa
  if (resetScreen) {
    return (
      <>
        <Header isAuthenticated={isAuthenticated} onOpen={(m) => openModal(m)} onLogout={handleLogout} />
        <ResetPasswordPage
          initialToken={resetScreen.token}
          onReset={handleReset}
          onBack={handleResetBack}
          onSuccess={handleResetSuccess}
        />
        <Footer />
      </>
    );
  }

  // Si hay verificación pendiente, mostrar pantalla completa por encima de todo (obligatoria)
  if (verifyScreen) {
    return (
      <>
        <Header isAuthenticated={isAuthenticated} onOpen={(m) => openModal(m)} onLogout={handleLogout} />
        <VerifyEmailPage
          initialEmail={verifyScreen.email}
          onVerify={handleVerify}
          onBack={handleVerifyBack}
          onSuccess={handleVerifySuccess}
        />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        onOpen={(m) => openModal(m)}
        onLogout={handleLogout}
      />

      {!isAuthenticated ? (
        <Hero />
      ) : (
        user && <Dashboard user={user} />
      )}

      <AuthModals
        open={modal}
        onClose={closeModal}
        onSwitch={switchModal}
        onLogin={login}
        onRegister={handleRegister}
        onForgot={forgot}
      />
      <Footer />
    </>
  );
}
