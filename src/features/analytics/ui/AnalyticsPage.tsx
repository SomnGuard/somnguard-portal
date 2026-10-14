import { useEffect, useMemo, useState } from 'react';
import { getAnalyticsMetricsApi, getAnalyticsReportApi, getAnalyticsSummaryApi, getAnalyticsTimelineApi, type AnalyticsEvent, type AnalyticsMetrics, type AnalyticsSummary } from '../api/analytics.api';
import { getUserMessage } from '../../../shared/api/errors';
import { hasPermission } from '../../../app/router/paths';
import { useAuth } from '../../auth/model/AuthContext';
import { listCatalogApi } from '../../security/api/catalogs.api';
import { useToast } from '../../../shared/ui/Toast';
import { downloadAnalyticsPdf } from '../api/analytics-pdf';

const iso = (value: string) => value ? new Date(value).toISOString() : undefined;
const stamp = (value?: string | null) => {
  if (!value) return '—'; const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleString();
};
const dayLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

function Breakdown({ title, entries }: { title: string; entries: Array<{ code?: string; name?: string; count: number }> }) {
  const max = Math.max(1, ...entries.map((entry) => entry.count));
  return <section className="analytics-panel">
    <div className="analytics-panel-title"><h2>{title}</h2><span>{entries.length} categorías</span></div>
    {entries.length ? <div className="analytics-breakdown">{entries.map((entry, index) => <div className="analytics-breakdown-row" key={`${entry.code ?? entry.name}-${index}`}>
      <div className="analytics-breakdown-label"><span>{entry.name || entry.code || 'Sin clasificar'}</span><strong>{entry.count}</strong></div>
      <div className="analytics-meter"><span style={{ width: `${Math.max(2, (entry.count / max) * 100)}%` }} /></div>
    </div>)}</div> : <p className="analytics-muted">Sin datos para el periodo seleccionado.</p>}
  </section>;
}

function EventRows({ events }: { events: AnalyticsEvent[] }) {
  if (!events.length) return <div className="analytics-empty">No hay eventos para mostrar.</div>;
  return <div className="analytics-event-list">{events.map((event) => <article className="analytics-event" key={event.id}>
    <span className={`analytics-severity ${(event.severityCode ?? '').toLowerCase()}`}>{event.severityName || event.severityCode || 'Sin severidad'}</span>
    <div className="analytics-event-copy"><strong>{event.eventTypeName || event.eventTypeCode || 'Evento'}</strong><span>{event.categoryName || 'Sin categoría'} · Dispositivo {event.deviceId || '—'}</span></div>
    <time>{stamp(event.occurredAt)}</time>
  </article>)}</div>;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="analytics-kpi"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;
  const canGenerate = hasPermission(user, 'ANALYTICS_GENERATE');
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return toLocalInput(d); });
  const [to, setTo] = useState(() => toLocalInput(new Date()));
  const [deviceId, setDeviceId] = useState('');
  const [eventTypeId, setEventTypeId] = useState('');
  const [eventTypes, setEventTypes] = useState<Array<{ id: string; label: string }>>([]);
  const [eventTypesError, setEventTypesError] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void listCatalogApi('event-types').then((rows) => {
      if (cancelled) return;
      const options = rows
        .filter((row) => row['isActive'] !== false)
        .map((row) => ({ id: String(row['id'] ?? ''), label: String(row['name'] ?? row['code'] ?? '') }))
        .filter((item) => item.id && item.label)
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));
      setEventTypes(options);
      setEventTypesError('');
    }).catch((reason) => {
      if (!cancelled) setEventTypesError(getUserMessage(reason));
    });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const rangeError = useMemo(() => {
    if (!from || !to) return '';
    const start = new Date(from).valueOf(); const end = new Date(to).valueOf();
    if (start > end) return 'La fecha inicial debe ser anterior a la fecha final.';
    if (end - start > 93 * 24 * 60 * 60 * 1000) return 'El rango máximo permitido por Analytics es de 93 días.';
    return '';
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    if (rangeError) { setLoading(false); setError(rangeError); return () => { cancelled = true; }; }
    setLoading(true); setError('');
    const filters = { from: iso(from), to: iso(to) };
    void Promise.all([
      getAnalyticsMetricsApi(filters), getAnalyticsSummaryApi(filters),
      getAnalyticsTimelineApi({ ...filters, deviceId: isAdmin ? deviceId.trim() || undefined : undefined, eventTypeId: isAdmin ? eventTypeId.trim() || undefined : undefined, severity: severity || undefined, page, pageSize: 15 }),
    ]).then(([m, s, timeline]) => {
      if (cancelled) return;
      setMetrics(m); setSummary(s); setEvents(timeline.data); setTotalPages(timeline.pagination.totalPages); setTotalEvents(timeline.pagination.totalItems);
    }).catch((reason) => { if (!cancelled) setError(getUserMessage(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, deviceId, eventTypeId, severity, page, rangeError, isAdmin]);

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const result = await getAnalyticsReportApi({ from: iso(from), to: iso(to) });
      downloadAnalyticsPdf(result);
      toast({ type: 'success', title: 'Reporte descargado', msg: 'Se generó el PDF con la información autorizada para tu cuenta.' });
    }
    catch (reason) { setError(getUserMessage(reason)); }
    finally { setReportLoading(false); }
  };

  const maxDay = Math.max(1, ...(metrics?.byDay ?? []).map((d) => d.count));
  const trend = summary?.trend;
  const scopeText = metrics?.scope.adminView ? 'Vista administrativa' : `${metrics?.scope.deviceCount ?? 0} dispositivos asignados`;

  return <section className="analytics-page">
    <header className="page-header analytics-header"><div><span className="eyebrow">MONITOREO · DATOS</span><h1>Analítica</h1><p>Resumen de actividad y eventos en el periodo seleccionado.</p></div>
      {canGenerate ? <button className="device-button primary" onClick={() => void generateReport()} disabled={reportLoading || loading || Boolean(rangeError)}>{reportLoading ? 'Generando…' : 'Descargar reporte PDF'}</button> : null}
    </header>
    <section className="analytics-filters" aria-label="Filtros de analítica">
      <label>Desde<input type="datetime-local" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} /></label>
      <label>Hasta<input type="datetime-local" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} /></label>
      {isAdmin ? <label>Dispositivo<input value={deviceId} onChange={(e) => { setPage(1); setDeviceId(e.target.value); }} placeholder="ID del dispositivo" /></label> : null}
      {isAdmin ? <label>Tipo de evento<select value={eventTypeId} onChange={(e) => { setPage(1); setEventTypeId(e.target.value); }}><option value="">Todos los tipos</option>{eventTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select>{eventTypesError ? <small role="status">No se pudo cargar el catálogo de tipos.</small> : null}</label> : null}
      <label>Severidad<select value={severity} onChange={(e) => { setPage(1); setSeverity(e.target.value); }}><option value="">Todas</option><option value="info">Informativa</option><option value="warning">Advertencia</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
    </section>
    {error ? <div className="analytics-error" role="alert">{error}</div> : null}
    <div className="analytics-context"><span>{scopeText}</span><span>Los filtros de periodo aplican a métricas, resumen y eventos.</span></div>
    <section className="analytics-kpis">
      <MetricCard label="Eventos registrados" value={loading && !metrics ? '…' : String(metrics?.totalEvents ?? 0)} detail={`${metrics?.byType.length ?? 0} tipos detectados`} />
      <MetricCard label="Dispositivos en alcance" value={String(metrics?.scope.deviceCount ?? '—')} detail={metrics?.scope.adminView ? 'Alcance administrativo' : 'Según asignaciones actuales'} />
      <MetricCard label="Eventos sincronizados sin conexión" value={metrics ? `${(metrics.offlineSync.ratio * 100).toFixed(1)}%` : '—'} detail={`${metrics?.offlineSync.offlineCount ?? 0} de ${metrics?.offlineSync.total ?? 0} eventos sincronizados`} />
      <MetricCard label="Variación de eventos" value={trend?.percentChange == null ? '—' : `${trend.percentChange > 0 ? '+' : ''}${trend.percentChange.toFixed(1)}%`} detail={trend ? `${trend.currentTotal} eventos vs. ${trend.previousTotal} en el periodo anterior` : 'Disponible con periodo cerrado'} />
    </section>
    <section className="analytics-explanations" aria-label="Cómo interpretar las métricas">
      <p><strong>Sin conexión:</strong> porcentaje de eventos guardados por el dispositivo sin internet y sincronizados al recuperar la conexión. No mide cuánto tiempo estuvo desconectado.</p>
      <p><strong>Variación:</strong> compara la cantidad de eventos con el periodo anterior. Una disminución no significa por sí sola que la situación haya mejorado.</p>
    </section>
    <section className="analytics-grid">
      <section className="analytics-panel analytics-chart-panel"><div className="analytics-panel-title"><h2>Actividad diaria</h2><span>{metrics?.byDay.length ?? 0} días</span></div>
        {metrics?.byDay.length ? <div className="analytics-chart" role="img" aria-label="Eventos por día">{metrics.byDay.map((item) => <div className="analytics-day" key={item.date} title={`${item.count} eventos`}><strong>{item.count}</strong><span className="analytics-column" style={{ height: `${Math.max(4, item.count / maxDay * 100)}%` }} /><small>{dayLabel(item.date)}</small></div>)}</div> : <p className="analytics-muted">{loading ? 'Cargando actividad…' : 'Sin actividad en el periodo seleccionado.'}</p>}
        {metrics?.eventSpan?.note ? <p className="analytics-note">{metrics.eventSpan.note}</p> : null}
      </section>
      <Breakdown title="Por severidad" entries={metrics?.bySeverity ?? []} />
      <Breakdown title="Por categoría" entries={metrics?.byCategory ?? []} />
      <Breakdown title="Tipos principales" entries={summary?.topTypes ?? metrics?.byType.slice(0, 5) ?? []} />
    </section>
    {metrics?.severityPriorityNote ? <p className="analytics-note analytics-priority-note">Prioridad media de severidad: {metrics.severityPriorityAvg?.toFixed(2) ?? '—'}. {metrics.severityPriorityNote}</p> : null}
    <section className="analytics-panel analytics-timeline"><div className="analytics-panel-title"><div><h2>Línea de eventos</h2><p>{totalEvents} resultados en el filtro actual</p></div><span>Página {page} de {Math.max(1, totalPages)}</span></div>
      {loading ? <div className="analytics-empty">Cargando analítica…</div> : error ? null : <EventRows events={events} />}
      <footer className="analytics-pagination"><button disabled={loading || page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>Anterior</button><span>{totalEvents} eventos</span><button disabled={loading || page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>Siguiente</button></footer>
    </section>
  </section>;
}

function toLocalInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
