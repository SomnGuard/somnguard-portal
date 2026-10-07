import { useEffect, useState } from 'react';
import { listNotificationsApi, markNotificationReadApi, type NotificationItem } from '../../notifications/api/notifications.api';

function channelLabel(channel: string): string {
  if (channel === 'in_app') return 'En la aplicación';
  if (channel === 'push') return 'Notificación push';
  if (channel === 'email') return 'Correo electrónico';
  return channel;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'NOTIFICATION_READ': return 'Leída';
    case 'NOTIFICATION_DELIVERED': return 'Entregada';
    case 'NOTIFICATION_SENT': return 'Enviada';
    case 'NOTIFICATION_FAILED': return 'Falló el envío';
    case 'NOTIFICATION_PENDING': return 'Pendiente';
    default: return status;
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function NotificationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"></path>
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0"></path>
    </svg>
  );
}

export function MyAlertsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await listNotificationsApi(1, 50);
        if (cancelled) return;
        setItems(page.data);
        setTotal(Number(page.pagination.totalItems ?? page.data.length));
      } catch {
        if (!cancelled) setError('No se pudieron cargar las notificaciones.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRead = async (id: string) => {
    try {
      const updated = await markNotificationReadApi(id);
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch {
      setError('No se pudo marcar como leída. Reintenta.');
    }
  };

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <section className="module-page user-page">
      <header className="page-header user-page-header">
        <div>
          <h1>Notificaciones</h1>
          <p>Consulta los avisos generados por SomnGuard y revisa cuáles aún necesitan tu atención.</p>
        </div>
      </header>

      {error ? <div className="user-alert user-alert-error" role="alert">{error}</div> : null}

      <section className="notifications-summary">
        <div className="summary-primary">
          <span className="summary-icon"><NotificationIcon /></span>
          <div>
            <strong>{total}</strong>
            <span>notificaciones registradas</span>
          </div>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Sin leer</span>
          <strong className={unread > 0 ? 'summary-alert' : ''}>{unread}</strong>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Estado</span>
          <strong>{unread > 0 ? 'Requiere revisión' : 'Al día'}</strong>
        </div>
      </section>

      <section className="notifications-panel">
        <div className="notifications-panel-head">
          <div>
            <h2>Historial de notificaciones</h2>
            <p>Los avisos más recientes aparecen primero.</p>
          </div>
          <span className="notifications-total-pill">{items.length} visibles</span>
        </div>

        {loading ? (
          <div className="notifications-loading">Cargando notificaciones…</div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="notifications-empty-state">
            <span className="notifications-empty-icon"><NotificationIcon /></span>
            <h3>No hay notificaciones</h3>
            <p>Cuando SomnGuard genere un aviso para tu cuenta, aparecerá aquí.</p>
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="notification-list">
            {items.map((n) => (
              <article key={n.id} className={`notification-card${n.readAt ? ' read' : ' unread'}`}>
                <div className="notification-card-icon"><NotificationIcon /></div>
                <div className="notification-card-content">
                  <div className="notification-card-title">
                    <h3>{n.title || '(sin título)'}</h3>
                    {!n.readAt ? <span className="new-badge">Nueva</span> : <span className="read-badge">Leída</span>}
                  </div>
                  <p>{n.message}</p>
                  <div className="notification-card-meta">
                    <span>{fmtDate(n.createdAt)}</span>
                    <span>·</span>
                    <span>{channelLabel(n.channel)}</span>
                    <span>·</span>
                    <span>{statusLabel(n.status)}</span>
                  </div>
                </div>
                {!n.readAt ? (
                  <button className="notification-read-btn" onClick={() => void handleRead(n.id)}>Marcar como leída</button>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
