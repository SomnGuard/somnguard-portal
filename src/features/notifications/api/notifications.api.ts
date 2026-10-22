/**
 * Notificaciones in-app + preferencias (HU-API-009, FEA-MON-NOTIFY).
 * Backend snake_case (SNAKE_CASE Jackson): se aceptan ambas variantes.
 */
import { httpRequest } from '../../../shared/api/client';
import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { getAccessToken } from '../../../shared/api/secureStorage';

export interface NotificationItem {
  id: string;
  alertLogId?: string | null;
  title: string;
  message: string;
  channel: string;
  status: string;
  statusCategory?: string | null;
  retryCount?: number;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt?: string | null;
}

export interface NotificationPage {
  data: NotificationItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface NotificationPreferences {
  userId?: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string | null;
  minSeverityCode?: string | null;
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function toItem(o: Record<string, unknown>): NotificationItem {
  return {
    id: String(o['id'] ?? ''),
    alertLogId: (o['alert_log_id'] ?? o['alertLogId'] ?? null) as string | null,
    title: String(o['title'] ?? ''),
    message: String(o['message'] ?? ''),
    channel: String(o['channel'] ?? ''),
    status: String(o['status'] ?? ''),
    statusCategory: (o['status_category'] ?? o['statusCategory'] ?? null) as string | null,
    retryCount: Number(o['retry_count'] ?? o['retryCount'] ?? 0),
    sentAt: (o['sent_at'] ?? o['sentAt'] ?? null) as string | null,
    deliveredAt: (o['delivered_at'] ?? o['deliveredAt'] ?? null) as string | null,
    readAt: (o['read_at'] ?? o['readAt'] ?? null) as string | null,
    createdAt: (o['created_at'] ?? o['createdAt'] ?? null) as string | null,
  };
}

function toPage(raw: unknown): NotificationPage {
  const o = (raw ?? {}) as Record<string, unknown>;
  const arr: unknown[] = Array.isArray(o['data']) ? (o['data'] as unknown[]) : [];
  const p = (o['pagination'] ?? {}) as Record<string, unknown>;
  return {
    data: arr
      .map((it) => toItem(it as Record<string, unknown>))
      .filter((d) => d.id),
    pagination: {
      page: Number(p['page'] ?? 1),
      pageSize: Number(p['page_size'] ?? p['pageSize'] ?? arr.length),
      totalItems: Number(p['total_items'] ?? p['totalItems'] ?? arr.length),
      totalPages: Number(p['total_pages'] ?? p['totalPages'] ?? 1),
    },
  };
}

export async function listNotificationsApi(page = 1, pageSize = 20): Promise<NotificationPage> {
  if (!getAccessToken()) return { data: [], pagination: { page, pageSize, totalItems: 0, totalPages: 0 } };
  const raw = await httpRequest<unknown>(endpoints.notifications.list(page, pageSize), HTTP.GET);
  return toPage(raw);
}

export async function getUnreadCountApi(): Promise<number> {
  if (!getAccessToken()) return 0;
  try {
    const raw = await httpRequest<Record<string, unknown>>(endpoints.notifications.unreadCount, HTTP.GET);
    return Number(pick<number>(raw, 'unread_count', 'unreadCount') ?? 0);
  } catch {
    return 0;
  }
}

export async function retryPendingNotificationsApi(): Promise<Record<string, number>> {
  return httpRequest<Record<string, number>>(endpoints.notifications.retry, HTTP.POST);
}

export async function markNotificationReadApi(id: string): Promise<NotificationItem> {
  const raw = await httpRequest<Record<string, unknown>>(endpoints.notifications.read(id), HTTP.POST, {});
  return toItem(raw);
}

export async function getPreferencesApi(): Promise<NotificationPreferences | null> {
  if (!getAccessToken()) return null;
  const raw = await httpRequest<Record<string, unknown>>(endpoints.notifications.preferences, HTTP.GET);
  return {
    userId: pick<string>(raw, 'user_id', 'userId'),
    pushEnabled: Boolean(pick<boolean>(raw, 'push_enabled', 'pushEnabled') ?? true),
    emailEnabled: Boolean(pick<boolean>(raw, 'email_enabled', 'emailEnabled') ?? false),
    inAppEnabled: Boolean(pick<boolean>(raw, 'in_app_enabled', 'inAppEnabled') ?? true),
    quietHoursStart: (pick<string>(raw, 'quiet_hours_start', 'quietHoursStart') ?? null) as string | null,
    quietHoursEnd: (pick<string>(raw, 'quiet_hours_end', 'quietHoursEnd') ?? null) as string | null,
    timezone: pick<string>(raw, 'timezone'),
    minSeverityCode: pick<string>(raw, 'min_severity_code', 'minSeverityCode'),
  };
}

export async function updatePreferencesApi(prefs: {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
  minSeverityCode?: string;
}): Promise<NotificationPreferences | null> {
  const body: Record<string, unknown> = {
    push_enabled: prefs.pushEnabled,
    email_enabled: prefs.emailEnabled,
    in_app_enabled: prefs.inAppEnabled,
    quiet_hours_start: prefs.quietHoursStart,
    quiet_hours_end: prefs.quietHoursEnd,
    timezone: prefs.timezone,
    min_severity_code: prefs.minSeverityCode,
  };
  const raw = await httpRequest<Record<string, unknown>>(endpoints.notifications.preferences, HTTP.PUT, body);
  return getPreferencesApiFromRaw(raw);
}

function getPreferencesApiFromRaw(raw: Record<string, unknown>): NotificationPreferences {
  return {
    userId: pick<string>(raw, 'user_id', 'userId'),
    pushEnabled: Boolean(pick<boolean>(raw, 'push_enabled', 'pushEnabled') ?? true),
    emailEnabled: Boolean(pick<boolean>(raw, 'email_enabled', 'emailEnabled') ?? false),
    inAppEnabled: Boolean(pick<boolean>(raw, 'in_app_enabled', 'inAppEnabled') ?? true),
    quietHoursStart: (pick<string>(raw, 'quiet_hours_start', 'quietHoursStart') ?? null) as string | null,
    quietHoursEnd: (pick<string>(raw, 'quiet_hours_end', 'quietHoursEnd') ?? null) as string | null,
    timezone: pick<string>(raw, 'timezone'),
    minSeverityCode: pick<string>(raw, 'min_severity_code', 'minSeverityCode'),
  };
}
