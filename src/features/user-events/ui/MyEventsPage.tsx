import { useEffect, useState } from 'react';
import { getEventEvidenceApi, listEventsApi, type DeviceEvent } from '../api/events.api';
import { useLang, type I18nKey } from '../../../shared/i18n/LanguageContext';

const PAGE_SIZES = [10, 20, 50] as const;

type SeverityKey = '' | 'info' | 'warning' | 'high' | 'critical';

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

/** Nombres del catálogo (005_insert_event_type.sql). El backend solo guarda `es`;
 * en inglés se mapea por código con fallback al nombre que mande el servidor. */
const EVENT_TYPE_EN: Record<string, string> = {
  'EV-SOM-01': 'Abnormal blinking',
  'EV-SOM-02': 'Prolonged eye closure',
  'EV-SOM-03': 'Yawn detected',
  'EV-SOM-04': 'Head nodding/tilt',
  'EV-SOM-05': 'Microsleep detected',
  'EV-DIS-01': 'Mobile phone use',
  'EV-DIS-02': 'Prolonged phone use',
  'EV-DIS-03': 'Eyes off road',
  'EV-DIS-04': 'Prolonged eyes off road',
  'EV-DIS-05': 'Abnormal movement',
  'EV-CIN-01': 'Seatbelt not detected',
  'EV-CIN-02': 'Seatbelt misplaced',
  'EV-SYS-01': 'Initialization successful',
  'EV-SYS-02': 'Camera error/obstruction',
  'EV-SYS-03': 'Face not detected',
  'EV-SYS-04': 'Connectivity lost',
  'EV-SYS-05': 'Connectivity restored',
  'EV-SYS-06': 'Storage almost full',
};

function eventName(e: DeviceEvent, lang: string): string {
  if (lang === 'en') {
    const mapped = EVENT_TYPE_EN[(e.eventTypeCode ?? '').toUpperCase()];
    if (mapped) return mapped;
  }
  return e.eventTypeName || e.eventTypeCode || '—';
}

function severityLabel(code: string | null | undefined, t: (k: I18nKey) => string): string {
  switch (sevKey(code)) {
    case 'info':
      return t('ev.info');
    case 'warning':
      return t('ev.warning');
    case 'high':
      return t('ev.high');
    case 'critical':
      return t('ev.crit');
    default:
      return code || '—';
  }
}

function fmtShort(iso: string | null | undefined, lang = 'es'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang === 'en' ? 'en' : 'es';
  const date = d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date} · ${time}`;
}

function fmtLong(iso: string | null | undefined, lang = 'es'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === 'en' ? 'en' : 'es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function eventDateKey(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(key: string, t: (k: I18nKey) => string, lang: string): string {
  if (key === 'unknown') return t('ev.unknownDay');
  const now = new Date();
  const today = eventDateKey(now.toISOString());
  const y = new Date();
  y.setDate(now.getDate() - 1);
  const yesterday = eventDateKey(y.toISOString());
  if (key === today) return t('ev.today');
  if (key === yesterday) return t('ev.yesterday');
  const [Y, M, D] = key.split('-').map(Number);
  if (!Y || !M || !D) return key;
  try {
    const s = new Date(Y, M - 1, D).toLocaleDateString(lang === 'en' ? 'en' : 'es', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return key;
  }
}

function hhmm(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function relTime(iso: string | null | undefined, t: (k: I18nKey) => string, lang: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (lang === 'en') {
    if (m < 1) return 'Now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ago`;
    return `${Math.floor(h / 24)} d ago`;
  }
  if (m < 1) return t('ev.now');
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  return `Hace ${Math.floor(h / 24)} d`;
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
  const { t, lang } = useLang();
  const SEVERITY_TABS: Array<{ key: SeverityKey; label: string }> = [
    { key: '', label: t('ev.all') },
    { key: 'info', label: t('ev.info') },
    { key: 'warning', label: t('ev.warning') },
    { key: 'high', label: t('ev.high') },
    { key: 'critical', label: t('ev.crit') },
  ];
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
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selected || !selected.hasEvidence) {
      setEvidenceUrl(null);
      setEvidenceError(null);
      setEvidenceLoading(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      setEvidenceLoading(true);
      setEvidenceError(null);
      setEvidenceUrl(null);
      try {
        const { blob } = await getEventEvidenceApi(selected.id);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setEvidenceUrl(objectUrl);
      } catch {
        if (!cancelled) setEvidenceError('No se pudo cargar la evidencia.');
      } finally {
        if (!cancelled) setEvidenceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
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

  const groups = (() => {
    const map = new Map<string, DeviceEvent[]>();
    for (const e of items) {
      const k = eventDateKey(e.occurredAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] === 'unknown' ? 1 : b[0] === 'unknown' ? -1 : b[0].localeCompare(a[0])))
      .map(([key, rows]) => ({ key, rows }));
  })();

  return (
    <section className="module-page user-page ev-page">
      <header className="page-header user-page-header">
        <div>
          <h1>{t('ev.title')}</h1>
          <p>{t('ev.subtitle')}</p>
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
          <span>{t('ev.events')}</span>
        </div>
        <div className="ev-stat">
          <strong className={criticalTotal > 0 ? 'ev-critical-n' : ''}>{criticalTotal}</strong>
          <span>{t('ev.critical')}</span>
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
            {t('ev.from')} <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            {t('ev.to')} <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <span className="ev-quick">
            <button onClick={() => handleQuick('today')}>{t('ev.today')}</button>
            <button onClick={() => handleQuick('7d')}>{t('ev.last7')}</button>
            <button onClick={() => handleQuick('30d')}>{t('ev.last30')}</button>
          </span>
        </div>
        <div className="ev-filter-actions">
          <button className="ev-apply" onClick={handleSearch}>
            {t('ev.apply')}
          </button>
          <button className="ev-clear" onClick={handleClear}>
            {t('ev.clear')}
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
                  {n} {t('ev.perPage')}
                </option>
              ))}
            </select>
          </span>
        </div>
      </section>

      <div className="ev-list-head">
        <h2>{t('ev.recent')}</h2>
        <span>{total} {t('ev.results')}</span>
      </div>

      {loading ? <div className="notifications-loading">{t('ev.loading')}</div> : null}

      {!loading && items.length === 0 ? (
        <div className="notifications-empty-state">
          <h3>{t('ev.empty')}</h3>
          <p>{t('ev.emptyHint')}</p>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="ev-timeline-list">
          {groups.map((g) => (
            <section key={g.key} className="ev-day">
              <div className="ev-day-head">
                <h3>{dayLabel(g.key, t, lang)}</h3>
                <span>{g.rows.length} {g.rows.length === 1 ? t('ev.event') : t('ev.eventsPlural')}</span>
              </div>
              <div className="ev-timeline">
                <span className="ev-timeline-line" aria-hidden="true" />
                {g.rows.map((e) => (
                  <article key={e.id} className={`ev-card sev-${sevKey(e.severityCode)}`}>
                    <span className="ev-card-dot" aria-hidden="true" />
                    <div className="ev-card-top">
                      <span className="ev-icon">
                        <EventTypeIcon code={e.eventTypeCode} />
                      </span>
                      <div className="ev-card-body">
                        <h4>{eventName(e, lang)}</h4>
                        <span className={`sev-badge sev-${sevKey(e.severityCode)}`}>{severityLabel(e.severityCode, t)}</span>
                      </div>
                      <div className="ev-card-time">
                        <strong>{hhmm(e.occurredAt)}</strong>
                        <span>{relTime(e.occurredAt, t, lang)}</span>
                      </div>
                    </div>
                    <div className="ev-card-sub">{e.eventTypeCode ?? ''} · {fmtShort(e.occurredAt, lang)}</div>
                    <div className="ev-card-foot">
                      <span className={`ev-flag${e.hasEvidence ? ' yes' : ''}`}>
                        <i aria-hidden="true" />
                        {e.hasEvidence ? t('ev.withEvidence') : t('ev.withoutEvidence')}
                      </span>
                      <button
                        type="button"
                        className="ev-btn"
                        onClick={() => setSelected(e)}
                        aria-label={`Ver detalle de ${eventName(e, lang)}`}
                      >
                        {e.hasEvidence ? t('ev.view') : t('ev.details')}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
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
            <button className="ev-drawer-close" onClick={() => setSelected(null)} aria-label={t('ev.close')}>
              ✕
            </button>
            <span className="user-eyebrow">{t('ev.detail')}</span>
            <h2>{eventName(selected, lang)}</h2>
            <p className="ev-drawer-code">{selected.eventTypeCode}</p>
            <div className="ev-media">
              {evidenceLoading ? <div className="ev-media-state">{t('ev.loadingEvidence')}</div> : null}
              {!evidenceLoading && evidenceUrl ? (
                <>
                  <img src={evidenceUrl} alt={eventName(selected, lang)} />
                  <span className="ev-media-tag">{severityLabel(selected.severityCode, t)}</span>
                  <span className="ev-media-stamp">{fmtShort(selected.occurredAt, lang)}</span>
                </>
              ) : null}
              {!evidenceLoading && !evidenceUrl ? (
                <div className="ev-media-state">
                  <span>{selected.hasEvidence ? (evidenceError || t('ev.noPreview')) : t('ev.noImage')}</span>
                  {selected.hasEvidence && evidenceError ? (
                    <button className="ev-apply" onClick={() => setSelected({ ...selected })}>{t('ev.retry')}</button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <dl className="ev-detail">
              <div>
                <dt>{t('ev.severity')}</dt>
                <dd>
                  <span className={`sev-badge sev-${sevKey(selected.severityCode)}`}>
                    {severityLabel(selected.severityCode, t)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>{t('ev.occurred')}</dt>
                <dd>{fmtLong(selected.occurredAt, lang)}</dd>
              </div>
              <div>
                <dt>{t('ev.device')}</dt>
                <dd>{selected.deviceId ?? '—'}</dd>
              </div>
              <div>
                <dt>{t('ev.evidence')}</dt>
                <dd>{selected.hasEvidence ? t('ev.evidenceYes') : t('ev.evidenceNo')}</dd>
              </div>
              <div>
                <dt>{t('ev.connectivity')}</dt>
                <dd>{selected.isOfflineSync ? t('ev.offline') : t('ev.online')}</dd>
              </div>
            </dl>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
