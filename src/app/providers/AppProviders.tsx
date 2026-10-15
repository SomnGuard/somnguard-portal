import { AuthProvider } from '../../features/auth/model/AuthContext';
import { ToastProvider } from '../../shared/ui/Toast';
import { ThemeProvider } from '../../shared/theme/ThemeContext';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
