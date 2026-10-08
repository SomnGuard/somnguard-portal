import { useEffect, useState } from 'react';
import { getEventEvidenceApi, listEventsApi, type DeviceEvent } from '../api/events.api';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';

function stamp(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString();
}

export function AdminEventsPage() {
  const toast = useToast();
  const [items, setItems] = useState<DeviceEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DeviceEvent | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => () => { if (evidenceUrl) URL.revokeObjectURL(evidenceUrl); }, [evidenceUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    void listEventsApi({ severity: severity || undefined, from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to).toISOString() : undefined, page, pageSize: 20 })
      .then((result) => { if (!cancelled) { setItems(result.data); setTotal(result.pagination.totalItems); setTotalPages(result.pagination.totalPages); } })
      .catch((reason) => { if (!cancelled) setError(getUserMessage(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [severity, from, to, page]);

  const showEvidence = async () => {
    if (!selected) return;
    setEvidenceLoading(true);
    try {
      const result = await getEventEvidenceApi(selected.id);
      setEvidenceType(result.contentType);
      setEvidenceUrl(URL.createObjectURL(result.blob));
    } catch (reason) { toast({ type: 'error', title: 'No se pudo cargar la evidencia', msg: getUserMessage(reason) }); }
    finally { setEvidenceLoading(false); }
  };

  return (
    <section className="admin-events-page">
      <header className="page-header"><div><span className="eyebrow">MONITOREO</span><h1>Historial de eventos</h1><p>Consulta los eventos registrados por los dispositivos.</p></div><div className="page-actions"><strong className="admin-events-total">{total} eventos</strong></div></header>
      <section className="admin-events-filters">
        <label>Severidad<select value={severity} onChange={(e) => { setPage(1); setSeverity(e.target.value); }}><option value="">Todas</option><option value="info">Informativa</option><option value="warning">Advertencia</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
        <label>Desde<input type="datetime-local" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} /></label>
        <label>Hasta<input type="datetime-local" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} /></label>
      </section>
      {error ? <div className="admin-events-error" role="alert">{error}</div> : null}
      <section className="admin-events-table-wrap"><table className="admin-events-table"><thead><tr><th>Evento</th><th>Dispositivo</th><th>Severidad</th><th>Ocurrido</th><th>Evidencia</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={5} className="admin-events-empty">Cargando eventos…</td></tr> : null}
        {!loading && items.length === 0 ? <tr><td colSpan={5} className="admin-events-empty">No hay eventos para estos filtros.</td></tr> : null}
        {!loading && items.map((item) => <tr key={item.id} onClick={() => setSelected(item)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(item); }}><td><strong>{item.eventTypeName || item.eventTypeCode || 'Evento'}</strong><small>{item.eventTypeCode || item.id}</small></td><td>{item.deviceId || '—'}</td><td><span className={`admin-event-severity ${(item.severityCode || '').toLowerCase()}`}>{item.severityName || item.severityCode || '—'}</span></td><td>{stamp(item.occurredAt)}</td><td>{item.hasEvidence ? 'Disponible' : '—'}</td></tr>)}
      </tbody></table></section>
      <footer className="admin-events-pagination"><span>Página {page} de {Math.max(1, totalPages)}</span><div><button disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button><button disabled={loading || page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</button></div></footer>
      {selected ? <div className="device-modal-backdrop" onClick={() => { setSelected(null); setEvidenceUrl(''); }}><section className="device-modal" role="dialog" aria-modal="true" aria-label="Detalle del evento" onClick={(e) => e.stopPropagation()}><button className="device-modal-close" onClick={() => { setSelected(null); setEvidenceUrl(''); }} aria-label="Cerrar">×</button><span className="eyebrow">DETALLE DEL EVENTO</span><h2>{selected.eventTypeName || selected.eventTypeCode || 'Evento'}</h2><dl className="admin-event-detail"><dt>Identificador</dt><dd>{selected.id}</dd><dt>Dispositivo</dt><dd>{selected.deviceId || '—'}</dd><dt>Tipo</dt><dd>{selected.eventTypeCode || '—'}</dd><dt>Severidad</dt><dd>{selected.severityName || selected.severityCode || '—'}</dd><dt>Ocurrido</dt><dd>{stamp(selected.occurredAt)}</dd><dt>Sincronizado offline</dt><dd>{selected.isOfflineSync ? 'Sí' : 'No'}</dd><dt>Evidencia</dt><dd>{selected.hasEvidence ? 'Disponible' : 'No disponible'}</dd></dl>{selected.hasEvidence ? <div className="admin-event-evidence"><button className="device-button secondary" disabled={evidenceLoading} onClick={() => void showEvidence()}>{evidenceLoading ? 'Cargando evidencia…' : evidenceUrl ? 'Volver a cargar evidencia' : 'Ver evidencia'}</button>{evidenceUrl && evidenceType.startsWith('image/') ? <img src={evidenceUrl} alt="Evidencia del evento" /> : null}{evidenceUrl && evidenceType.startsWith('video/') ? <video src={evidenceUrl} controls /> : null}{evidenceUrl && !evidenceType.startsWith('image/') && !evidenceType.startsWith('video/') ? <a href={evidenceUrl} download={`evidencia-${selected.id}`} target="_blank" rel="noreferrer">Abrir o descargar archivo ({evidenceType})</a> : null}</div> : null}</section></div> : null}
    </section>
  );
}
