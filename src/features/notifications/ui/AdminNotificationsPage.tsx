import { useEffect, useState } from 'react';
import { getUserMessage } from '../../../shared/api/errors';
import { listNotificationsApi, markNotificationReadApi, type NotificationItem } from '../api/notifications.api';
import { useToast } from '../../../shared/ui/Toast';

function formatStamp(value?: string | null) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Fecha no disponible' : date.toLocaleString();
}

export function AdminNotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    void listNotificationsApi(page, pageSize).then((result) => {
      if (!cancelled) { setItems(result.data); setTotalItems(result.pagination.totalItems); setTotalPages(result.pagination.totalPages); }
    }).catch((reason) => { if (!cancelled) setError(getUserMessage(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, pageSize]);

  const markRead = async (item: NotificationItem) => {
    setBusyId(item.id);
    try {
      const updated = await markNotificationReadApi(item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, ...updated, readAt: updated.readAt || new Date().toISOString() } : row));
      toast({ type: 'success', title: 'Aviso actualizado', msg: 'La notificación quedó marcada como leída.' });
    } catch (reason) { toast({ type: 'error', title: 'No se pudo marcar como leída', msg: getUserMessage(reason) }); }
    finally { setBusyId(''); }
  };

  return (
    <section className="admin-notifications-page">
      <header className="page-header"><div><span className="eyebrow">CENTRO DE AVISOS</span><h1>Notificaciones</h1><p>Consulta los avisos enviados a la cuenta autenticada.</p></div><div className="page-actions"><strong className="admin-events-total">{totalItems} notificaciones</strong></div></header>
      {error ? <div className="admin-events-error" role="alert">{error}</div> : null}
      {loading ? <div className="admin-events-empty panel">Cargando notificaciones…</div> : null}
      {!loading && !error && items.length === 0 ? <div className="admin-events-empty panel">No hay notificaciones para mostrar.</div> : null}
      {!loading && items.length > 0 ? <div className="admin-notification-list">{items.map((item) => <article key={item.id} className={item.readAt ? 'is-read' : 'is-unread'}><span className="admin-notification-indicator" /><div className="admin-notification-content"><div className="admin-notification-heading"><strong>{item.title || 'Notificación'}</strong><span>{item.statusCategory || item.status || item.channel}</span></div><p>{item.message}</p><small>{formatStamp(item.createdAt)}{item.channel ? ` · ${item.channel}` : ''}{item.retryCount ? ` · Intentos: ${item.retryCount}` : ''}</small></div>{item.readAt ? <span className="admin-notification-read">Leída</span> : <button className="device-button secondary" disabled={busyId === item.id} onClick={() => void markRead(item)}>{busyId === item.id ? 'Guardando…' : 'Marcar leída'}</button>}</article>)}</div> : null}
      <footer className="admin-events-pagination"><span>Página {page} de {Math.max(1, totalPages)}</span><div><button disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><button disabled={loading || page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</button></div></footer>
    </section>
  );
}
