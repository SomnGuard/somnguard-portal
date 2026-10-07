import { useEffect, useState } from 'react';
import { getPreferencesApi, updatePreferencesApi, type NotificationPreferences } from '../../notifications/api/notifications.api';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path>
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path>
    </svg>
  );
}

export function NotificationPreferencesPage() {
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
          <h1>Preferencias</h1>
          <p>Controla cómo quieres recibir los avisos de SomnGuard. Este apartado es independiente del historial de notificaciones.</p>
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
                <h2>Notificaciones</h2>
                <p>Activa o desactiva los avisos que se muestran en tu cuenta y las notificaciones push.</p>
              </div>
            </div>

            <div className="preference-toggle-row">
              <div>
                <strong>Recibir notificaciones</strong>
                <span>{enabled ? 'Los avisos están habilitados.' : 'Los avisos están deshabilitados.'}</span>
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
                <h2>Configuración actual</h2>
                <p>Valores definidos por tu cuenta.</p>
              </div>
            </div>
            <dl className="preferences-list">
              <div><dt>En la aplicación</dt><dd>{prefs?.inAppEnabled ? 'Activa' : 'Desactivada'}</dd></div>
              <div><dt>Push</dt><dd>{prefs?.pushEnabled ? 'Activa' : 'Desactivada'}</dd></div>
              <div><dt>Correo</dt><dd>{prefs?.emailEnabled ? 'Activo' : 'No configurado'}</dd></div>
              <div><dt>Zona horaria</dt><dd>{prefs?.timezone || 'No definida'}</dd></div>
              <div><dt>Severidad mínima</dt><dd>{prefs?.minSeverityCode || 'No definida'}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}
