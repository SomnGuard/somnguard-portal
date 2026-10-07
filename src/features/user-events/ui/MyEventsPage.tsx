import { useEffect, useState } from 'react';
import { listEventsApi, type DeviceEvent } from '../api/events.api';

const PAGE_SIZES = [10, 20, 50] as const;

type SeverityKey = '' | 'info' | 'warning' | 'high' | 'critical';

const SEVERITY_TABS: Array<{ key: SeverityKey; label: string }> = [
  { key: '', label: 'Todas' },
  { key: 'info', label: 'Informativa' },
  { key: 'warning', label: 'Advertencia' },
  { key: 'high', label: 'Alta' },
  { key: 'critical', label: 'Crítica' },
];

function sevKey(code: string | null | undefined): Exclude<SeverityKey, ''> | 'unknown' {
  switch ((code ?? '').toLowerCase()) {
    case 'info':
    case 'leve':
      return 'info';
    case 'warning':
    case 'moderada':
      return 'warning';
    case 'high':
    case 'severa':
      return 'high';
    case 'critical':
    case 'critica':
      return 'critical';
    default:
      return 'unknown';
  }
}

function severityLabel(code: string | null | undefined): string {
  switch (sevKey(code)) {
    case 'info':
      return 'Informativa';
    case 'warning':
      return 'Advertencia';
    case 'high':
      return 'Alta';
    case 'critical':
      return 'Crítica';
    default:
      return code || 'Sin severidad';
  }
}

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date} · ${time}`;
}

function fmtLong(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** "2026-10-02T13:00" -> ISO con offset local (el backend exige OffsetDateTime). */
function withOffset(local: string): string {
  if (!local) return '';
  const withSeconds = local.length === 16 ? `${local}:00` : local;
  const offMin = -new Date().getTimezoneOffset();
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${withSeconds}${sign}${hh}:${mm}`;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return withOffset(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00`,
  );
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return withOffset(
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
  );
}

function EventTypeIcon({ code }: { code: string | null | undefined }) {
  const c = (code ?? '').toUpperCase();
  let path: React.ReactNode;
  if (c.startsWith('EV-SOM')) {
    path = (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </>
    );
  } else if (c === 'EV-DIS-02') {
    path = (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2"></rect>
        <path d="M10 18h4"></path>
      </>
    );
  } else if (c.startsWith('EV-DIS')) {
    path = (
      <>
        <circle cx="12" cy="12" r="8.5"></circle>
        <circle cx="12" cy="12" r="1.6"></circle>
        <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"></path>
      </>
    );
  } else if (c.startsWith('EV-CIN')) {
    path = <path d="M4 4h16l-2.5 16h-11L4 4Z"></path>;
  } else {
    path = <path d="M3 12h4l2-6 4 12 2-6h6"></path>;
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {path}
    </svg>
  );
}

function pageWindow(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, 2, current - 1, current, current + 1, total - 1, total]);
  const nums = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}

export function MyEventsPage() {
  const [items, setItems] = useState<DeviceEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [criticalTotal, setCriticalTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [severity, setSeverity] = useState<SeverityKey>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ severity: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeviceEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [result, crit] = await Promise.all([
          listEventsApi({
            severity: applied.severity || undefined,
            from: applied.from || undefined,
            to: applied.to || undefined,
            page,
            pageSize,
          }),
          listEventsApi({ severity: 'critical', page: 1, pageSize: 1 }),
        ]);
        if (cancelled) return;
        setItems(result.data);
        setTotal(Number(result.pagination.totalItems ?? 0));
        setTotalPages(Number(result.pagination.totalPages ?? 0));
        setCriticalTotal(Number(crit.pagination.totalItems ?? 0));
      } catch {
        if (!cancelled) setError('No se pudieron cargar los eventos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applied, page, pageSize]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const handleSearch = () => {
    setPage(1);
    setApplied({
      severity,
      from: from ? withOffset(from) : '',
      to: to ? withOffset(to) : '',
    });
  };

  const handleClear = () => {
    setSeverity('');
    setFrom('');
    setTo('');
    setPage(1);
    setApplied({ severity: '', from: '', to: '' });
  };

  const handleQuick = (kind: 'today' | '7d' | '30d') => {
    const f = kind === 'today' ? startOfToday() : daysAgo(kind === '7d' ? 7 : 30);
    setPage(1);
    setApplied({ severity, from: f, to: '' });
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <section className="module-page user-page ev-page">
      <header className="page-header user-page-header">
        <div>
          <h1>Historial de eventos</h1>
          <p>Eventos detectados por tu dispositivo</p>
        </div>
      </header>

      {error ? (
        <div className="user-alert user-alert-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="ev-stats">
        <div className="ev-stat">
          <strong>{total}</strong>
          <span>Eventos</span>
        </div>
        <div className="ev-stat">
          <strong className={criticalTotal > 0 ? 'ev-critical-n' : ''}>{criticalTotal}</strong>
          <span>Críticos</span>
        </div>
      </section>

      <section className="ev-filters" aria-label="Filtros">
        <div className="ev-chips" role="group" aria-label="Severidad">
          {SEVERITY_TABS.map((t) => (
            <button
              key={t.key || 'all'}
              className={`ev-chip${severity === t.key ? ' active' : ''}`}
              onClick={() => setSeverity(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ev-filter-row">
          <label>
            Desde <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Hasta <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <span className="ev-quick">
            <button onClick={() => handleQuick('today')}>Hoy</button>
            <button onClick={() => handleQuick('7d')}>7 días</button>
            <button onClick={() => handleQuick('30d')}>30 días</button>
          </span>
        </div>
        <div className="ev-filter-actions">
          <button className="ev-apply" onClick={handleSearch}>
            Aplicar filtros
          </button>
          <button className="ev-clear" onClick={handleClear}>
            Limpiar
          </button>
          <span className="ev-pagesize">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Eventos por página"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} por página
                </option>
              ))}
            </select>
          </span>
        </div>
      </section>

      <div className="ev-list-head">
        <h2>Eventos recientes</h2>
        <span>{total} resultados</span>
      </div>

      {loading ? <div className="notifications-loading">Cargando eventos…</div> : null}

      {!loading && items.length === 0 ? (
        <div className="notifications-empty-state">
          <h3>No hay eventos</h3>
          <p>Cuando tu dispositivo detecte algo, aparecerá aquí.</p>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="ev-list">
          {items.map((e) => (
            <article
              key={e.id}
              className={`ev-row sev-${sevKey(e.severityCode)}`}
              onClick={() => setSelected(e)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') setSelected(e);
              }}
              tabIndex={0}
              role="button"
              aria-label={`Ver detalle de ${e.eventTypeName || e.eventTypeCode}`}
            >
              <span className="ev-icon">
                <EventTypeIcon code={e.eventTypeCode} />
              </span>
              <div className="ev-main">
                <div className="ev-top">
                  <h3>{e.eventTypeName || e.eventTypeCode || '(sin tipo)'}</h3>
                  <span className="sev-badge">{severityLabel(e.severityCode)}</span>
                </div>
                <div className="ev-sub">
                  {e.eventTypeCode ?? ''} · {fmtShort(e.occurredAt)}
                </div>
                <div className="ev-meta">
                  {e.hasEvidence ? 'Evidencia disponible' : 'Sin evidencia'} ·{' '}
                  {e.isOfflineSync ? 'Sincronizado sin conexión' : 'Sincronizado'}
                </div>
              </div>
              <span className="ev-chev" aria-hidden="true">
                ›
              </span>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && totalPages > 1 ? (
        <div className="ev-pagination">
          <span>
            Mostrando {rangeStart}–{rangeEnd} de {total}
          </span>
          <nav aria-label="Paginación">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Anterior">
              ‹
            </button>
            {pageWindow(page, totalPages).map((n, i) =>
              n === '…' ? (
                <span key={`e${i}`} className="ev-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  className={n === page ? 'active' : ''}
                  onClick={() => setPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                >
                  {n}
                </button>
              ),
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Siguiente"
            >
              ›
            </button>
          </nav>
        </div>
      ) : null}

      {selected ? (
        <div className="ev-drawer-overlay" onClick={() => setSelected(null)}>
          <aside
            className="ev-drawer"
            role="dialog"
            aria-label="Detalle del evento"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="ev-drawer-close" onClick={() => setSelected(null)} aria-label="Cerrar detalle">
              ✕
            </button>
            <span className="user-eyebrow">Detalle del evento</span>
            <h2>{selected.eventTypeName || selected.eventTypeCode}</h2>
            <p className="ev-drawer-code">{selected.eventTypeCode}</p>
            <dl className="ev-detail">
              <div>
                <dt>Severidad</dt>
                <dd>
                  <span className={`sev-badge sev-${sevKey(selected.severityCode)}`}>
                    {severityLabel(selected.severityCode)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Ocurrido</dt>
                <dd>{fmtLong(selected.occurredAt)}</dd>
              </div>
              <div>
                <dt>Dispositivo</dt>
                <dd>{selected.deviceId ?? '—'}</dd>
              </div>
              <div>
                <dt>Evidencia</dt>
                <dd>{selected.hasEvidence ? 'Evidencia disponible' : 'Sin evidencia'}</dd>
              </div>
              <div>
                <dt>Conectividad</dt>
                <dd>{selected.isOfflineSync ? 'Sincronizado sin conexión' : 'Sincronizado en línea'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
