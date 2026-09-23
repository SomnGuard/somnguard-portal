import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../features/auth/model/AuthContext';
import { VerifyEmailPage } from '../../features/auth/ui/VerifyEmailPage';
import { ResetPasswordPage } from '../../features/auth/ui/ResetPasswordPage';
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
      onSuccess={() => navigate(paths.public.home)}
    />
  );
}

export function ResetPasswordRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();
  const queryToken = new URLSearchParams(location.search).get('token') ?? '';


  return (
    <ResetPasswordPage
      initialToken={queryToken}
      onReset={async (token, newPassword) => { await resetPassword(token, newPassword); }}
      onBack={() => navigate(paths.public.home)}
      onSuccess={() => navigate(paths.public.home)}
    />
  );
}
