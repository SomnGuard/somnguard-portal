import { AutoLiveBox } from '../../streaming/ui/AutoLiveBox';
import { useLang } from '../../../shared/i18n/LanguageContext';

export function MyDevicePage() {
  const { t } = useLang();
  return (
    <section className="module-page user-page">
      <header className="page-header user-page-header">
        <div>
          <h1>{t('mon.title')}</h1>
          <p>{t('mon.subtitle')}</p>
        </div>
      </header>
      <AutoLiveBox />
    </section>
  );
}
