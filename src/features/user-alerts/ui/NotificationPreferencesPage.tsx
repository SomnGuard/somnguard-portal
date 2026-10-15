import { useEffect, useState } from 'react';
import { getPreferencesApi, updatePreferencesApi, type NotificationPreferences } from '../../notifications/api/notifications.api';
import { useLang, type AppLanguage } from '../../../shared/i18n/LanguageContext';
import { useTheme, type ThemeName } from '../../../shared/theme/ThemeContext';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path>
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path>
    </svg>
  );
}

const THEMES: ThemeName[] = ['dark', 'light'];
const LANGS: AppLanguage[] = ['es', 'en'];

export function NotificationPreferencesPage() {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPreferencesApi();
        if (!cancelled) setPrefs(data);
      } catch {
        if (!cancelled) setError('No se pudieron cargar tus preferencias.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async (enabled: boolean) => {
    if (!prefs) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updatePreferencesApi({
        pushEnabled: enabled,
        inAppEnabled: enabled,
        emailEnabled: prefs.emailEnabled,
        quietHoursStart: prefs.quietHoursStart ?? null,
        quietHoursEnd: prefs.quietHoursEnd ?? null,
        timezone: prefs.timezone ?? undefined,
        minSeverityCode: prefs.minSeverityCode ?? undefined,
      });
      setPrefs(updated);
      setSaved(true);
    } catch {
      setError('No se pudieron guardar las preferencias.');
    } finally {
      setSaving(false);
    }
  };

  const enabled = prefs ? prefs.pushEnabled || prefs.inAppEnabled : false;

  return (
    <section className="module-page user-page">
      <header className="page-header user-page-header">
        <div>
          <h1>{t('prefs.title')}</h1>
          <p>{t('prefs.subtitle')}</p>
        </div>
      </header>

      {error ? <div className="user-alert user-alert-error" role="alert">{error}</div> : null}

      {loading ? (
        <div className="preferences-loading">Cargando preferencias…</div>
      ) : (
        <div className="preferences-layout">
          <section className="preferences-card preferences-main">
            <div className="preferences-card-head">
              <span className="preferences-icon"><BellIcon /></span>
              <div>
                <h2>{t('prefs.notifications')}</h2>
                <p>{t('prefs.notificationsHint')}</p>
              </div>
            </div>

            <div className="preference-toggle-row">
              <div>
                <strong>{t('prefs.toggle')}</strong>
                <span>{enabled ? t('prefs.toggleOn') : t('prefs.toggleOff')}</span>
              </div>
              <button
                type="button"
                className={`toggle-switch${enabled ? ' on' : ''}`}
                aria-pressed={enabled}
                disabled={saving || !prefs}
                onClick={() => void save(!enabled)}
              >
                <span aria-hidden="true"></span>
              </button>
            </div>

            {saved ? <div className="preferences-saved">Preferencias guardadas correctamente.</div> : null}
            {saving ? <div className="preferences-saving">Guardando cambios…</div> : null}
          </section>

          <section className="preferences-card preferences-secondary">
            <div className="preferences-card-head compact">
              <div>
                <h2>{t('prefs.appearance')}</h2>
                <p>{t('prefs.appearanceHint')}</p>
              </div>
            </div>
            <div className="ev-chips" role="group" aria-label={t('prefs.appearance')} style={{ marginTop: 12 }}>
              {THEMES.map((th) => (
                <button
                  key={th}
                  type="button"
                  className={`ev-chip${theme === th ? ' active' : ''}`}
                  onClick={() => setTheme(th)}
                >
                  {t(th === 'dark' ? 'prefs.theme.dark' : 'prefs.theme.light')}
                </button>
              ))}
            </div>

            <div className="preferences-card-head compact" style={{ marginTop: 18 }}>
              <div>
                <h2>{t('prefs.language')}</h2>
                <p>{t('prefs.languageHint')}</p>
              </div>
            </div>
            <div className="ev-chips" role="group" aria-label={t('prefs.language')} style={{ marginTop: 12 }}>
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`ev-chip${lang === l ? ' active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {t(l === 'es' ? 'prefs.lang.es' : 'prefs.lang.en')}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
