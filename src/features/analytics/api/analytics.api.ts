import { httpRequest } from '../../../shared/api/client';
import { endpoints, HTTP } from '../../../shared/api/endpoints';

export interface AnalyticsFilters {
  from?: string;
  to?: string;
}

export interface AnalyticsDimension { code?: string; name?: string; count: number; priority?: number | null }
export interface AnalyticsDay { date: string; count: number }
export interface AnalyticsMetrics {
  range: { from?: string | null; to?: string | null };
  scope: { adminView: boolean; deviceCount: number };
  totalEvents: number;
  byType: AnalyticsDimension[];
  bySeverity: AnalyticsDimension[];
  byCategory: AnalyticsDimension[];
  byDay: AnalyticsDay[];
  firstEventAt?: string | null;
  lastEventAt?: string | null;
  offlineSync: { offlineCount: number; total: number; ratio: number };
  severityPriorityAvg?: number | null;
  severityPriorityNote?: string | null;
  eventSpan?: { note?: string | null };
}
export interface AnalyticsTrend { previousTotal: number; currentTotal: number; delta: number; percentChange?: number | null }
export interface AnalyticsSummary extends AnalyticsMetrics {
  topTypes: AnalyticsDimension[];
  trend?: AnalyticsTrend | null;
}
export interface AnalyticsEvent {
  id: string;
  deviceId?: string | null;
  occurredAt?: string | null;
  eventTypeId?: string | null;
  eventTypeCode?: string | null;
  eventTypeName?: string | null;
  categoryName?: string | null;
  severityCode?: string | null;
  severityName?: string | null;
  severityPriority?: number | null;
  hasEvidence: boolean;
  mediaType?: string | null;
}
export interface AnalyticsTimeline {
  data: AnalyticsEvent[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}
export interface AnalyticsReport {
  generatedAt?: string;
  range?: AnalyticsMetrics['range'];
  scope?: AnalyticsMetrics['scope'];
  metrics: AnalyticsMetrics;
  summary: AnalyticsSummary;
  recentEvents: AnalyticsEvent[];
}

type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => value && typeof value === 'object' ? value as Obj : {};
const value = (o: Obj, snake: string, camel: string) => o[snake] ?? o[camel];
const number = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const optionalNumber = (v: unknown) => v == null ? null : number(v);

function dimension(raw: unknown): AnalyticsDimension {
  const o = obj(raw);
  return {
    code: (o['code'] ?? undefined) as string | undefined,
    name: (o['name'] ?? undefined) as string | undefined,
    count: number(o['count']),
    priority: optionalNumber(o['priority']),
  };
}

function metrics(raw: unknown): AnalyticsMetrics {
  const o = obj(raw); const range = obj(o['range']); const scope = obj(o['scope']);
  const offline = obj(value(o, 'offline_sync', 'offlineSync'));
  const span = obj(value(o, 'event_span', 'eventSpan'));
  const days = value(o, 'by_day', 'byDay');
  return {
    range: { from: (range['from'] ?? null) as string | null, to: (range['to'] ?? null) as string | null },
    scope: { adminView: Boolean(value(scope, 'admin_view', 'adminView')), deviceCount: number(value(scope, 'device_count', 'deviceCount')) },
    totalEvents: number(value(o, 'total_events', 'totalEvents')),
    byType: (Array.isArray(value(o, 'by_type', 'byType')) ? value(o, 'by_type', 'byType') as unknown[] : []).map(dimension),
    bySeverity: (Array.isArray(value(o, 'by_severity', 'bySeverity')) ? value(o, 'by_severity', 'bySeverity') as unknown[] : []).map(dimension),
    byCategory: (Array.isArray(value(o, 'by_category', 'byCategory')) ? value(o, 'by_category', 'byCategory') as unknown[] : []).map(dimension),
    byDay: (Array.isArray(days) ? days as unknown[] : []).map((entry) => { const d = obj(entry); return { date: String(d['date'] ?? ''), count: number(d['count']) }; }),
    firstEventAt: (value(o, 'first_event_at', 'firstEventAt') ?? null) as string | null,
    lastEventAt: (value(o, 'last_event_at', 'lastEventAt') ?? null) as string | null,
    offlineSync: { offlineCount: number(value(offline, 'offline_count', 'offlineCount')), total: number(offline['total']), ratio: number(offline['ratio']) },
    severityPriorityAvg: optionalNumber(value(o, 'severity_priority_avg', 'severityPriorityAvg')),
    severityPriorityNote: (value(o, 'severity_priority_note', 'severityPriorityNote') ?? null) as string | null,
    eventSpan: { note: (span['note'] ?? null) as string | null },
  };
}

function event(raw: unknown): AnalyticsEvent {
  const o = obj(raw); const type = obj(value(o, 'event_type', 'eventType'));
  const category = obj(o['category']); const severity = obj(o['severity']);
  return {
    id: String(o['id'] ?? ''),
    deviceId: (value(o, 'device_id', 'deviceId') ?? null) as string | null,
    occurredAt: (value(o, 'occurred_at', 'occurredAt') ?? null) as string | null,
    eventTypeId: (value(o, 'event_type_id', 'eventTypeId') ?? type['id'] ?? null) as string | null,
    eventTypeCode: (type['code'] ?? o['event_type_code'] ?? null) as string | null,
    eventTypeName: (type['name'] ?? o['event_type_name'] ?? null) as string | null,
    categoryName: (category['name'] ?? o['category_name'] ?? null) as string | null,
    severityCode: (severity['code'] ?? o['severity_code'] ?? null) as string | null,
    severityName: (severity['name'] ?? o['severity_name'] ?? null) as string | null,
    severityPriority: optionalNumber(severity['priority'] ?? o['severity_priority']),
    hasEvidence: Boolean(value(o, 'has_evidence', 'hasEvidence')),
    mediaType: (value(o, 'media_type', 'mediaType') ?? null) as string | null,
  };
}

export async function getAnalyticsMetricsApi(filters: AnalyticsFilters): Promise<AnalyticsMetrics> {
  return metrics(await httpRequest<unknown>(endpoints.analytics.metrics(filters), HTTP.GET));
}

export async function getAnalyticsSummaryApi(filters: AnalyticsFilters): Promise<AnalyticsSummary> {
  const raw = obj(await httpRequest<unknown>(endpoints.analytics.summary(filters), HTTP.GET));
  const base = metrics(raw);
  const trend = obj(raw['trend']);
  return {
    ...base,
    topTypes: (Array.isArray(value(raw, 'top_types', 'topTypes')) ? value(raw, 'top_types', 'topTypes') as unknown[] : []).map(dimension),
    trend: raw['trend'] == null ? null : {
      previousTotal: number(value(trend, 'previous_total', 'previousTotal')),
      currentTotal: number(value(trend, 'current_total', 'currentTotal')),
      delta: number(trend['delta']),
      percentChange: optionalNumber(value(trend, 'percent_change', 'percentChange')),
    },
  };
}

export async function getAnalyticsTimelineApi(filters: AnalyticsFilters & { deviceId?: string; eventTypeId?: string; severity?: string; page?: number; pageSize?: number }): Promise<AnalyticsTimeline> {
  const raw = obj(await httpRequest<unknown>(endpoints.analytics.timeline(filters), HTTP.GET));
  const p = obj(raw['pagination']);
  return {
    data: (Array.isArray(raw['data']) ? raw['data'] as unknown[] : []).map(event).filter((item) => item.id),
    pagination: {
      page: number(p['page'], filters.page ?? 1), pageSize: number(value(p, 'page_size', 'pageSize'), filters.pageSize ?? 20),
      totalItems: number(value(p, 'total_items', 'totalItems')), totalPages: number(value(p, 'total_pages', 'totalPages')),
    },
  };
}

export async function getAnalyticsReportApi(filters: AnalyticsFilters): Promise<AnalyticsReport> {
  const raw = obj(await httpRequest<unknown>(endpoints.analytics.report(filters), HTTP.GET));
  return {
    generatedAt: (value(raw, 'generated_at', 'generatedAt') ?? undefined) as string | undefined,
    range: raw['range'] as AnalyticsMetrics['range'] | undefined,
    scope: raw['scope'] as AnalyticsMetrics['scope'] | undefined,
    metrics: metrics(raw['metrics']),
    summary: await normalizeSummary(raw['summary']),
    recentEvents: (Array.isArray(value(raw, 'recent_events', 'recentEvents')) ? value(raw, 'recent_events', 'recentEvents') as unknown[] : []).map(event),
  };
}

async function normalizeSummary(rawValue: unknown): Promise<AnalyticsSummary> {
  const raw = obj(rawValue); const base = metrics(raw); const trend = obj(raw['trend']);
  return {
    ...base,
    topTypes: (Array.isArray(value(raw, 'top_types', 'topTypes')) ? value(raw, 'top_types', 'topTypes') as unknown[] : []).map(dimension),
    trend: raw['trend'] == null ? null : {
      previousTotal: number(value(trend, 'previous_total', 'previousTotal')),
      currentTotal: number(value(trend, 'current_total', 'currentTotal')),
      delta: number(trend['delta']), percentChange: optionalNumber(value(trend, 'percent_change', 'percentChange')),
    },
  };
}
