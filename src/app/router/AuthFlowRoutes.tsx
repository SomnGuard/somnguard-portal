import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/AuthContext';
import { VerifyEmailPage } from '../../features/auth/ui/VerifyEmailPage';
import { VerifyResetCodePage } from '../../features/auth/ui/VerifyResetCodePage';
import { ResetPasswordPage } from '../../features/auth/ui/ResetPasswordPage';
import { useToast } from '../../shared/ui/Toast';
import { paths } from './paths';

export function VerifyEmailRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const email = searchParams.get('email') ?? '';

  return (
    <VerifyEmailPage
      initialEmail={email}
      onVerify={async (code) => { await verifyEmail({ code }); }}
      onBack={() => navigate(paths.public.home)}
      onSuccess={() => navigate(paths.public.home, { state: { openLogin: true } })}
    />
  );
}

// Paso 2 del flujo de recuperación (rama fix/function-reset-password):
// solicitar código -> verificar código de 6 dígitos -> restablecer contraseña.
export function VerifyResetCodeRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyResetCode, forgot } = useAuth();
  const toast = useToast();
  const email = searchParams.get('email') ?? '';

  const handleResend = async () => {
    if (!email) return;
    try {
      await forgot(email);
      toast({ title: 'Código reenviado', msg: 'Si el correo existe, se envió un nuevo código de 6 dígitos.', type: 'success' });
    } catch {
      toast({ title: 'Error', msg: 'No se pudo reenviar el código. Intenta de nuevo.', type: 'error' });
    }
  };

  return (
    <VerifyResetCodePage
      email={email}
      onVerify={async (code) => { await verifyResetCode(code); }}
      onBack={() => navigate(paths.public.home)}
      onSuccess={(code) => {
        const params = new URLSearchParams({ code, email }).toString();
        navigate(`${paths.public.resetPassword}?${params}`);
      }}
      onResend={handleResend}
    />
  );
}

export function ResetPasswordRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();
  const params = new URLSearchParams(location.search);
  const code = params.get('code') ?? params.get('token') ?? '';
  const email = params.get('email') ?? '';

  return (
    <ResetPasswordPage
      code={code}
      email={email}
      onReset={async (verifiedCode, newPassword) => { await resetPassword(verifiedCode, newPassword); }}
      onBack={() => navigate(paths.public.home)}
      onSuccess={() => navigate(paths.public.home, { state: { openLogin: true } })}
    />
  );
}
