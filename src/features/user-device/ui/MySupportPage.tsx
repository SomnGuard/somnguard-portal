import { Link } from 'react-router-dom';
import { useLang } from '../../../shared/i18n/LanguageContext';
import type { I18nKey } from '../../../shared/i18n/LanguageContext';
import { paths } from '../../../app/router/paths';

const FAQ_KEYS: Array<{ q: I18nKey; a: I18nKey }> = [
  { q: 'help.faq1q', a: 'help.faq1a' },
  { q: 'help.faq2q', a: 'help.faq2a' },
  { q: 'help.faq3q', a: 'help.faq3a' },
  { q: 'help.faq4q', a: 'help.faq4a' },
  { q: 'help.faq5q', a: 'help.faq5a' },
  { q: 'help.faq6q', a: 'help.faq6a' },
];

const QUICK_KEYS: Array<{ q: I18nKey; a: I18nKey }> = [
  { q: 'help.q1', a: 'help.a1' },
  { q: 'help.q2', a: 'help.a2' },
  { q: 'help.q3', a: 'help.a3' },
];

export function MySupportPage() {
  const { t } = useLang();
  return (
    <section className="module-page user-page">
      <header className="page-header user-page-header">
        <div>
          <h1>{t('help.title')}</h1>
          <p>{t('help.subtitle')}</p>
        </div>
      </header>

      <div className="account-layout">
        <section className="account-card">
          <h2>{t('help.privacy')}</h2>
          <p className="muted">{t('help.privacyBody')}</p>
          <dl className="account-list">
            <div><dt>{t('help.data')}</dt><dd>{t('help.dataVal')}</dd></div>
            <div><dt>{t('help.evidence')}</dt><dd>{t('help.evidenceVal')}</dd></div>
            <div><dt>{t('help.removal')}</dt><dd>{t('help.removalVal')}</dd></div>
          </dl>
          <div className="account-links">
            <Link to={paths.public.privacy}>{t('foot.privacy')}</Link>
            <Link to={paths.public.terms}>{t('foot.terms')}</Link>
          </div>
        </section>

        <section className="account-card">
          <h2>{t('help.contact')}</h2>
          <p className="muted">{t('help.contactBody')}</p>
          <dl className="account-list">
            <div><dt>{t('help.support')}</dt><dd>soporte@somnguard.tech</dd></div>
            <div><dt>{t('help.hours')}</dt><dd>{t('help.hoursVal')}</dd></div>
          </dl>
        </section>

        <section className="account-card">
          <h2>{t('help.faq')}</h2>
          <dl className="account-list">
            {QUICK_KEYS.map((item) => (
              <div key={item.q}><dt>{t(item.q)}</dt><dd>{t(item.a)}</dd></div>
            ))}
          </dl>
        </section>
      </div>

      <section className="help-faq">
        <h2>{t('help.faq')}</h2>
        {FAQ_KEYS.map((item) => (
          <details key={item.q} className="help-faq-item">
            <summary>{t(item.q)}</summary>
            <p>{t(item.a)}</p>
          </details>
        ))}
      </section>
    </section>
  );
}
