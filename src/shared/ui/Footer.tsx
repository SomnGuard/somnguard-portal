import { Link } from 'react-router-dom';
import { paths } from '../../app/router/paths';
import { useLang } from '../../shared/i18n/LanguageContext';
import { useTheme } from '../../shared/theme/ThemeContext';

export function Footer() {
  const { t } = useLang();
  const { theme, setTheme } = useTheme();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">SomnGuard</span>
          <span className="footer-subtitle">Sistema de monitoreo y gestión</span>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SomnGuard. Todos los derechos reservados.</span>
          <nav className="footer-links" aria-label="Enlaces legales">
            <Link to={paths.public.privacy}>{t('foot.privacy')}</Link>
            <span className="footer-sep" aria-hidden> | </span>
            <Link to={paths.public.terms}>{t('foot.terms')}</Link>
            <span className="footer-sep" aria-hidden> | </span>
            <a href="mailto:soporte@somnguard.tech">{t('foot.contact')}</a>
            <span className="footer-sep" aria-hidden> | </span>
            <button
              type="button"
              className="footer-theme-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? t('foot.light') : t('foot.dark')}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
              {theme === 'dark' ? t('foot.light') : t('foot.dark')}
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
