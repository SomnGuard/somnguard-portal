import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../../app/router/paths';
import { listDevicesApi } from '../../device-management/api/devices.api';
import { listEventsApi, type DeviceEvent } from '../../user-events/api/events.api';
import { getUnreadCountApi, retryPendingNotificationsApi } from '../../notifications/api/notifications.api';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';

type DashboardData = {
  devices: number | null;
  activeDevices: number | null;
  eventsThisWeek: number | null;
  unreadAlerts: number | null;
  recentEvents: DeviceEvent[];
};

const EMPTY: DashboardData = { devices: null, activeDevices: null, eventsThisWeek: null, unreadAlerts: null, recentEvents: [] };

function formatDate(value?: string | null) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Fecha no disponible' : date.toLocaleString();
}

export function AdminDashboard() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const results = await Promise.allSettled([
      listDevicesApi({ page: 1, pageSize: 1 }),
      listDevicesApi({ status: 'DEVICE_ACTIVE', page: 1, pageSize: 1 }),
      listEventsApi({ from: from.toISOString(), to: to.toISOString(), page: 1, pageSize: 5 }),
      getUnreadCountApi(),
      listEventsApi({ page: 1, pageSize: 5 }),
    ] as const);

    const [devices, active, weeklyEvents, unread, recent] = results;
    setData({
      devices: devices.status === 'fulfilled' ? devices.value.pagination.totalItems : null,
      activeDevices: active.status === 'fulfilled' ? active.value.pagination.totalItems : null,
      eventsThisWeek: weeklyEvents.status === 'fulfilled' ? weeklyEvents.value.pagination.totalItems : null,
      unreadAlerts: unread.status === 'fulfilled' ? unread.value : null,
      recentEvents: recent.status === 'fulfilled' ? recent.value.data : [],
    });
    const failure = results.find((item) => item.status === 'rejected');
    if (failure?.status === 'rejected') {
      toast({ type: 'error', title: 'Dashboard parcialmente disponible', msg: getUserMessage(failure.reason) });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const retryNotifications = async () => {
    setRetrying(true);
    try {
      const result = await retryPendingNotificationsApi();
      const count = Object.values(result).reduce((sum, value) => sum + Number(value || 0), 0);
      toast({ type: 'success', title: 'Reintento completado', msg: `La API procesó ${count} notificaciones pendientes.` });
      await load();
    } catch (error) { toast({ type: 'error', title: 'No se pudieron reintentar las notificaciones', msg: getUserMessage(error) }); }
    finally { setRetrying(false); }
  };

  return (
    <section className="admin-dashboard-page">
      <nav className="breadcrumb">dashboard / <b>resumen</b></nav>
      <header className="page-header">
        <div>
          <h1>Resumen general</h1>
          <p>Estado de dispositivos, eventos recientes y alertas del sistema.</p>
        </div>
        <div className="page-actions">
          <button className="admin-dash-refresh" type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Actualizando…' : '↻ Actualizar'}</button>
          <button className="admin-dash-refresh" type="button" onClick={() => void retryNotifications()} disabled={retrying}>{retrying ? 'Procesando…' : 'Reintentar avisos'}</button>
          <Link className="admin-dash-primary" to={paths.admin.deviceList}>Ver dispositivos <span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <div className="admin-dash-metrics">
        <article className="admin-dash-metric"><span className="admin-dash-icon">▣</span><div><small>Dispositivos registrados</small><strong>{loading && data.devices === null ? '…' : data.devices ?? '—'}</strong><span>Total en inventario</span></div></article>
        <article className="admin-dash-metric"><span className="admin-dash-icon online">●</span><div><small>Dispositivos activos</small><strong>{loading && data.activeDevices === null ? '…' : data.activeDevices ?? '—'}</strong><span>Con estado DEVICE_ACTIVE</span></div></article>
        <article className="admin-dash-metric"><span className="admin-dash-icon event">⌁</span><div><small>Eventos últimos 7 días</small><strong>{loading && data.eventsThisWeek === null ? '…' : data.eventsThisWeek ?? '—'}</strong><span>Según el rango reportado por API</span></div></article>
        <article className="admin-dash-metric"><span className="admin-dash-icon alert">♧</span><div><small>Alertas sin leer</small><strong>{loading && data.unreadAlerts === null ? '…' : data.unreadAlerts ?? '—'}</strong><span>Notificaciones pendientes</span></div></article>
      </div>

      <div className="admin-dash-grid">
        <section className="admin-dash-panel">
          <div className="admin-dash-panel-head"><div><span className="admin-dash-eyebrow">ACTIVIDAD</span><h2>Eventos recientes</h2></div><span className="admin-dash-live"><i /> Datos de la API</span></div>
          {loading && data.recentEvents.length === 0 ? <p className="admin-dash-empty">Cargando actividad…</p> : null}
          {!loading && data.recentEvents.length === 0 ? <p className="admin-dash-empty">No hay eventos recientes para mostrar.</p> : null}
          {data.recentEvents.length > 0 ? <div className="admin-dash-events">{data.recentEvents.map((event) => (
            <article key={event.id} className="admin-dash-event">
              <span className={`admin-dash-event-mark${(event.severityPriority ?? 0) >= 3 ? ' high' : ''}`} />
              <div className="admin-dash-event-main"><strong>{event.eventTypeName || event.eventTypeCode || 'Evento del dispositivo'}</strong><span>{event.deviceId ? `Dispositivo ${event.deviceId.slice(0, 8)}…` : 'Dispositivo'}</span></div>
              <div className="admin-dash-event-meta"><span>{event.severityName || event.severityCode || 'Sin severidad'}</span><time>{formatDate(event.occurredAt || event.createdAt)}</time></div>
            </article>
          ))}</div> : null}
        </section>

        <aside className="admin-dash-panel admin-dash-shortcuts">
          <div className="admin-dash-panel-head"><div><span className="admin-dash-eyebrow">GESTIÓN</span><h2>Accesos rápidos</h2></div></div>
          <Link to={paths.admin.deviceList}><span className="admin-dash-shortcut-icon">▣</span><span><strong>Inventario de dispositivos</strong><small>Registrar, asignar y revisar equipos</small></span><b>→</b></Link>
          <Link to={paths.admin.events}><span className="admin-dash-shortcut-icon">⌁</span><span><strong>Historial de eventos</strong><small>Filtrar actividad y consultar evidencia</small></span><b>→</b></Link>
          <Link to={paths.admin.notifications}><span className="admin-dash-shortcut-icon">♧</span><span><strong>Centro de avisos</strong><small>Consultar y marcar notificaciones</small></span><b>→</b></Link>
          <div className="admin-dash-note"><strong>Disponibilidad de datos</strong><p>El contrato actual ofrece listados paginados, conteo de alertas y consulta de eventos. Las métricas reflejan los totales que reporta la API; no se inventan valores de telemetría.</p></div>
        </aside>
      </div>
    </section>
  );
}
