import { useEffect, useState } from 'react';
import { Header } from '../shared/ui/Header';
import { Hero } from '../features/landing/ui/Hero';
import { Dashboard } from '../features/dashboard/ui/Dashboard';
import { AuthModals } from '../features/auth/ui/AuthModals';
import { VerifyEmailPage } from '../features/auth/ui/VerifyEmailPage';
import { VerifyResetCodePage } from '../features/auth/ui/VerifyResetCodePage';
import { ResetPasswordPage } from '../features/auth/ui/ResetPasswordPage';
import { Footer } from '../shared/ui/Footer';
import { useAuth } from '../features/auth/model/AuthContext';
import { useSoloLogoAnimation } from '../shared/hooks/useSoloLogoAnimation';
import { useToast } from '../shared/ui/Toast';

type ModalType = 'login' | 'register' | 'forgot' | null;

export default function App() {
  const { user, isAuthenticated, login, register, forgot, verifyEmail, verifyResetCode, resetPassword, logout } = useAuth();
  const toast = useToast();
  const [modal, setModal] = useState<ModalType>(null);
  // Pantalla completa obligatoria para verificar email tras registro
  const [verifyScreen, setVerifyScreen] = useState<{ email: string } | null>(null);
  // Flujo recuperación con código 6 dígitos: paso 2 verificación
  const [verifyResetScreen, setVerifyResetScreen] = useState<{ email: string } | null>(null);
  // Paso 3 restablecer contraseña (requiere código validado)
  const [resetWithCodeScreen, setResetWithCodeScreen] = useState<{ email: string; code: string } | null>(null);

  useSoloLogoAnimation('heroLogo');

  useEffect(() => {
    const hasRecovery = !!verifyResetScreen || !!resetWithCodeScreen;
    if (isAuthenticated && !verifyScreen && !hasRecovery) {
      setTimeout(() => {
        document.getElementById('dashboardStatsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [isAuthenticated, verifyScreen, verifyResetScreen, resetWithCodeScreen]);

  const openModal = (m: Exclude<ModalType, null>) => setModal(m);
  const closeModal = () => setModal(null);
  const switchModal = (to: Exclude<ModalType, null>) => {
    setModal(null);
    setTimeout(() => setModal(to), 180);
  };

  const handleLogout = async () => {
    await logout();
    setVerifyScreen(null);
    setVerifyResetScreen(null);
    setResetWithCodeScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRegister = async (payload: { firstName: string; lastName: string; email: string; phone: string; password: string }) => {
    await register(payload);
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
    if (!isAuthenticated) {
      setTimeout(() => setModal('login'), 300);
    }
  };

  const handleVerifyBack = () => {
    setVerifyScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Flujo recuperación: solicitar código -> verifyResetCode -> resetPassword
  const handleForgot = async (email: string) => {
    const msg = await forgot(email);
    // Navega a verificación de código tras éxito
    setVerifyResetScreen({ email });
    // cierra modal rápido (el propio ForgotModal también cierra, pero aseguramos)
    setModal(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return msg;
  };

  const handleVerifyResetCode = async (code: string) => {
    await verifyResetCode(code);
  };

  const handleVerifyResetSuccess = (code: string) => {
    const email = verifyResetScreen?.email ?? '';
    setResetWithCodeScreen({ email, code });
    setVerifyResetScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVerifyResetBack = () => {
    setVerifyResetScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResendResetCode = async () => {
    if (verifyResetScreen?.email) {
      try {
        await forgot(verifyResetScreen.email);
        toast({ title: 'Código reenviado', msg: 'Si el correo existe, se envió un nuevo código de 6 dígitos.', type: 'success' });
      } catch {
        toast({ title: 'Error', msg: 'No se pudo reenviar el código. Intenta de nuevo.', type: 'error' });
      }
    }
  };

  const handleResetWithCode = async (code: string, newPassword: string) => {
    await resetPassword(code, newPassword);
  };

  const handleResetSuccess = () => {
    // Limpiar código del estado local y no permitir reutilización
    setResetWithCodeScreen(null);
    setVerifyResetScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setModal('login'), 300);
  };

  const handleResetBack = () => {
    setResetWithCodeScreen(null);
    setVerifyResetScreen(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prioridad: restablecer contraseña con código validado
  if (resetWithCodeScreen) {
    return (
      <>
        <Header isAuthenticated={isAuthenticated} onOpen={(m) => openModal(m)} onLogout={handleLogout} />
        <ResetPasswordPage
          code={resetWithCodeScreen.code}
          email={resetWithCodeScreen.email}
          onReset={handleResetWithCode}
          onBack={handleResetBack}
          onSuccess={handleResetSuccess}
        />
        <Footer />
      </>
    );
  }

  // Verificación de código de recuperación (paso 2)
  if (verifyResetScreen) {
    return (
      <>
        <Header isAuthenticated={isAuthenticated} onOpen={(m) => openModal(m)} onLogout={handleLogout} />
        <VerifyResetCodePage
          email={verifyResetScreen.email}
          onVerify={handleVerifyResetCode}
          onBack={handleVerifyResetBack}
          onSuccess={handleVerifyResetSuccess}
          onResend={handleResendResetCode}
        />
        <Footer />
      </>
    );
  }

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
        onForgot={handleForgot}
      />
      <Footer />
    </>
  );
}
