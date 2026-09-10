import { AuthProvider } from '../../features/auth/model/AuthContext';
import { ToastProvider } from '../../shared/ui/Toast';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
