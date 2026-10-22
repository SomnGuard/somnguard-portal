/**
 * Streaming en vivo post-MVP (HU-PORTAL-005, ADR-013).
 * Contratos: POST start -> 201 {session_id,room,token_viewer,ws_url,expires_at},
 * POST stop idempotente, GET session 200 | 404/409 sin sesión.
 * Backend snake_case (SNAKE_CASE Jackson): se aceptan ambas variantes.
 */
import { httpRequest } from '../../../shared/api/client';
import { ApiError } from '../../../shared/api/errors';
import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { getAccessToken } from '../../../shared/api/secureStorage';

export interface StreamStartResult {
  sessionId: string;
  deviceId: string;
  room: string;
  tokenViewer: string;
  wsUrl: string;
  expiresAt: string;
  livekitUrl?: string;
  livekitToken?: string;
}

export interface StreamSessionState {
  sessionId: string;
  deviceId: string;
  room: string;
  viewerCount: number;
  startedAt: string;
  expiresAt: string;
  livekitUrl?: string;
  livekitToken?: string;
}

export interface StreamDeviceInfo {
  id: string;
  status: string;
  assignedUserId?: string | null;
  lastHeartbeatAt?: string | null;
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  const data = obj['data'];
  if (data && typeof data === 'object') {
    for (const k of keys) {
      const v = (data as Record<string, unknown>)[k];
      if (v !== undefined && v !== null) return v as T;
    }
  }
  return undefined;
}

export async function startStreamApi(deviceId: string): Promise<StreamStartResult> {
  const raw = await httpRequest<Record<string, unknown>>(endpoints.stream.start(deviceId), HTTP.POST, {});
  return {
    sessionId: pick<string>(raw, 'session_id', 'sessionId') ?? '',
    deviceId: pick<string>(raw, 'device_id', 'deviceId') ?? deviceId,
    room: pick<string>(raw, 'room') ?? '',
    tokenViewer: pick<string>(raw, 'token_viewer', 'tokenViewer') ?? '',
    wsUrl: pick<string>(raw, 'ws_url', 'wsUrl') ?? endpoints.stream.ws,
    expiresAt: pick<string>(raw, 'expires_at', 'expiresAt') ?? '',
    livekitUrl: pick<string>(raw, 'livekit_url', 'livekitUrl'),
    livekitToken: pick<string>(raw, 'livekit_token', 'livekitToken'),
  };
}

export async function stopStreamApi(deviceId: string, sessionId?: string): Promise<void> {
  // Sin token (logout) no hay nada que cerrar: evita 401 en cascada.
  if (!getAccessToken()) return;
  await httpRequest(endpoints.stream.stop(deviceId), HTTP.POST, sessionId ? { session_id: sessionId } : {});
}

export async function getStreamSessionApi(deviceId: string): Promise<StreamSessionState | null> {
  try {
    const raw = await httpRequest<Record<string, unknown>>(endpoints.stream.session(deviceId), HTTP.GET, null, true, [404]);
    return {
      sessionId: pick<string>(raw, 'session_id', 'sessionId') ?? '',
      deviceId: pick<string>(raw, 'device_id', 'deviceId') ?? deviceId,
      room: pick<string>(raw, 'room') ?? '',
      viewerCount: pick<number>(raw, 'viewer_count', 'viewerCount') ?? 1,
      startedAt: pick<string>(raw, 'started_at', 'startedAt') ?? '',
      expiresAt: pick<string>(raw, 'expires_at', 'expiresAt') ?? '',
      livekitUrl: pick<string>(raw, 'livekit_url', 'livekitUrl'),
      livekitToken: pick<string>(raw, 'livekit_token', 'livekitToken'),
    };
  } catch (e) {
    // 404 = sin sesión, estado normal al abrir: no es error.
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function getStreamDeviceApi(deviceId: string): Promise<StreamDeviceInfo> {
  const raw = await httpRequest<Record<string, unknown>>(endpoints.stream.device(deviceId), HTTP.GET);
  return {
    id: pick<string>(raw, 'id') ?? deviceId,
    status: pick<string>(raw, 'status') ?? 'DESCONOCIDO',
    assignedUserId: pick<string | null>(raw, 'assigned_user_id', 'assignedUserId') ?? null,
    lastHeartbeatAt: pick<string | null>(raw, 'last_heartbeat_at', 'lastHeartbeatAt') ?? null,
  };
}

export async function checkBackendHealth(): Promise<{ ok: boolean; status: number }> {
  if (!endpoints.stream.health) return { ok: false, status: 0 };
  try {
    const res = await fetch(endpoints.stream.health, { method: 'GET' });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function setDetectionPausedApi(deviceId: string, paused: boolean): Promise<boolean> {
  const raw = await httpRequest<Record<string, unknown>>(endpoints.stream.detection(deviceId), HTTP.POST, { paused });
  return Boolean(pick<boolean>(raw, 'paused') ?? paused);
}

export async function getDetectionPausedApi(deviceId: string): Promise<boolean> {
  const raw = await httpRequest<Record<string, unknown>>(endpoints.stream.detection(deviceId), HTTP.GET);
  return Boolean(pick<boolean>(raw, 'paused', 'detection_paused', 'detectionPaused') ?? false);
}

export async function listDevicesApi(): Promise<StreamDeviceInfo[]> {  const base = endpoints.stream.device('').replace(/\/$/, '');
  const raw = await httpRequest<unknown>(`${base}?page=1&page_size=20`, HTTP.GET);
  const arr: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)['data'])
      ? ((raw as Record<string, unknown>)['data'] as unknown[])
      : [];
  return arr.map((it) => {
    const o = it as Record<string, unknown>;
    return {
      id: String(o['id'] ?? ''),
      status: String(o['status'] ?? o['state'] ?? 'DESCONOCIDO'),
      assignedUserId: (o['assigned_user_id'] ?? o['assignedUserId'] ?? null) as string | null,
      lastHeartbeatAt: (o['last_heartbeat_at'] ?? o['lastHeartbeatAt'] ?? null) as string | null,
    };
  }).filter((d) => d.id);
}
