import { useNavigate } from 'react-router-dom';
import { paths } from '../../../app/router/paths';
import { useLang } from '../../../shared/i18n/LanguageContext';

function HomeLogo() {
  return (
    <svg viewBox="0 0 100 112" fill="none" aria-hidden="true">
      <path className="sg-logo-shield" d="M50 5 L88 19 L88 55 C88 79 70 97 50 107 C30 97 12 79 12 55 L12 19 Z" strokeWidth="5.5" strokeLinejoin="round"></path>
      <rect className="sg-logo-eye" x="26" y="38" width="48" height="24" rx="12" ry="12" strokeWidth="4"></rect>
      <circle className="sg-logo-pupil" cx="50" cy="50" r="9" stroke="none"></circle>
      <path className="sg-logo-smile" d="M41 73 Q50 78 59 73" strokeWidth="3.5" strokeLinecap="round"></path>
    </svg>
  );
}

export function UserDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  return (
    <section className="module-page user-page user-home">
      <div className="user-home-logo">
        <HomeLogo />
      </div>
      <h1>SOMNGUARD</h1>
      <p>{t('dash.subtitle')}</p>
      <div className="user-home-actions">
        <button
          type="button"
          className="user-home-primary"
          onClick={() => navigate(paths.user.device)}
        >
          {t('dash.start')}
        </button>
        <button
          type="button"
          className="user-home-outline"
          onClick={() => navigate(paths.user.events)}
        >
          {t('dash.events')}
        </button>
      </div>
    </section>
  );
}
