/**
 * Historial de eventos del usuario (HU-API-008, FEA-TEL-QUERY).
 * El backend filtra solo a los devices propios si no es admin.
 * Backend snake_case (SNAKE_CASE Jackson): se aceptan ambas variantes.
 */
import { httpRequest } from '../../../shared/api/client';
import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { getAccessToken } from '../../../shared/api/secureStorage';
import { parseApiError, logApiError } from '../../../shared/api/errors';

export interface DeviceEvent {
  id: string;
  deviceId?: string | null;
  eventTypeCode?: string | null;
  eventTypeName?: string | null;
  severityCode?: string | null;
  severityName?: string | null;
  severityPriority?: number | null;
  occurredAt?: string | null;
  hasEvidence?: boolean;
  isOfflineSync?: boolean;
  createdAt?: string | null;
}

export interface EventPage {
  data: DeviceEvent[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface EventFilters {
  severity?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

function toEvent(o: Record<string, unknown>): DeviceEvent {
  const type = (o['event_type'] ?? o['eventType'] ?? {}) as Record<string, unknown>;
  const sev = (o['severity'] ?? {}) as Record<string, unknown>;
  return {
    id: String(o['id'] ?? ''),
    deviceId: (o['device_id'] ?? o['deviceId'] ?? null) as string | null,
    eventTypeCode: (type['code'] ?? null) as string | null,
    eventTypeName: (type['name'] ?? null) as string | null,
    severityCode: (sev['code'] ?? null) as string | null,
    severityName: (sev['name'] ?? null) as string | null,
    severityPriority: (sev['priority'] ?? null) as number | null,
    occurredAt: (o['occurred_at'] ?? o['occurredAt'] ?? null) as string | null,
    hasEvidence: Boolean(o['has_evidence'] ?? o['hasEvidence'] ?? false),
    isOfflineSync: Boolean(o['is_offline_sync'] ?? o['isOfflineSync'] ?? false),
    createdAt: (o['created_at'] ?? o['createdAt'] ?? null) as string | null,
  };
}

export async function listEventsApi(filters: EventFilters): Promise<EventPage> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  if (!getAccessToken()) {
    return { data: [], pagination: { page, pageSize, totalItems: 0, totalPages: 0 } };
  }
  const raw = await httpRequest<Record<string, unknown>>(
    endpoints.events.list({
      severity: filters.severity || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page,
      pageSize,
    }),
    HTTP.GET,
  );
  const arr: unknown[] = Array.isArray(raw['data']) ? (raw['data'] as unknown[]) : [];
  const p = (raw['pagination'] ?? {}) as Record<string, unknown>;
  return {
    data: arr.map((it) => toEvent(it as Record<string, unknown>)).filter((d) => d.id),
    pagination: {
      page: Number(p['page'] ?? page),
      pageSize: Number(p['page_size'] ?? p['pageSize'] ?? pageSize),
      totalItems: Number(p['total_items'] ?? p['totalItems'] ?? 0),
      totalPages: Number(p['total_pages'] ?? p['totalPages'] ?? 0),
    },
  };
}

export async function getEventEvidenceApi(eventId: string): Promise<{ blob: Blob; contentType: string }> {
  const response = await fetch(endpoints.events.evidence(eventId), {
    method: 'GET',
    headers: { Accept: '*/*', ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) },
    credentials: 'include',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = parseApiError(response.status, body);
    logApiError(`getEventEvidence ${eventId} -> ${response.status}`, error);
    throw error;
  }
  const blob = await response.blob();
  return { blob, contentType: response.headers.get('content-type') || blob.type || 'application/octet-stream' };
}
