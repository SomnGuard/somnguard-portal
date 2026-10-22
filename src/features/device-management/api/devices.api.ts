import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { httpRequest } from '../../../shared/api/client';

export interface Device {
  id: string;
  serialNumber: string;
  firmwareVersion: string;
  status: string;
  statusCategory?: string;
  lastHeartbeatAt?: string | null;
  lastSeenIp?: string | null;
  assignedUserId?: string | null;
  assignedAt?: string | null;
  claimCode?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  appliedConfigVersion?: number | null;
  pendingConfigUpdate?: boolean;
  lastConfigPullAt?: string | null;
}

export interface DevicePage {
  data: Device[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface DeviceFilters {
  status?: string;
  assignedFrom?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
}

export interface DeviceCreateResult {
  id: string;
  serialNumber: string;
  firmwareVersion: string;
  status: string;
  apiKey?: string;
  claimCode?: string;
}

export interface RotatedDeviceKey { deviceId: string; apiKey: string; rotatedAt: string }
export interface ProvisioningToken { tokenId: string; token: string; expiresAt: string; maxUses: number }

function read<T>(obj: Record<string, unknown>, camel: string, snake?: string): T | undefined {
  return (obj[camel] ?? (snake ? obj[snake] : undefined)) as T | undefined;
}

function toDevice(value: unknown): Device {
  const d = (value ?? {}) as Record<string, unknown>;
  return {
    id: String(d.id ?? ''),
    serialNumber: String(read(d, 'serialNumber', 'serial_number') ?? ''),
    firmwareVersion: String(read(d, 'firmwareVersion', 'firmware_version') ?? ''),
    status: String(d.status ?? ''),
    statusCategory: read(d, 'statusCategory', 'status_category'),
    lastHeartbeatAt: read(d, 'lastHeartbeatAt', 'last_heartbeat_at') ?? null,
    lastSeenIp: read(d, 'lastSeenIp', 'last_seen_ip') ?? null,
    assignedUserId: read(d, 'assignedUserId', 'assigned_user_id') ?? null,
    assignedAt: read(d, 'assignedAt', 'assigned_at') ?? null,
    claimCode: read(d, 'claimCode', 'claim_code') ?? null,
    createdAt: read(d, 'createdAt', 'created_at') ?? null,
    updatedAt: read(d, 'updatedAt', 'updated_at') ?? null,
    appliedConfigVersion: read(d, 'appliedConfigVersion', 'applied_config_version') ?? null,
    pendingConfigUpdate: Boolean(read(d, 'pendingConfigUpdate', 'pending_config_update') ?? false),
    lastConfigPullAt: read(d, 'lastConfigPullAt', 'last_config_pull_at') ?? null,
  };
}

export async function listDevicesApi(filters: DeviceFilters): Promise<DevicePage> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const raw = await httpRequest<Record<string, unknown>>(endpoints.devices.list({ ...filters, page, pageSize }), HTTP.GET);
  const pagination = (raw.pagination ?? {}) as Record<string, unknown>;
  return {
    data: (Array.isArray(raw.data) ? raw.data : []).map(toDevice).filter((device) => device.id),
    pagination: {
      page: Number(read(pagination, 'page') ?? page),
      pageSize: Number(read(pagination, 'pageSize', 'page_size') ?? pageSize),
      totalItems: Number(read(pagination, 'totalItems', 'total_items') ?? 0),
      totalPages: Number(read(pagination, 'totalPages', 'total_pages') ?? 0),
    },
  };
}

export async function getDeviceApi(id: string): Promise<Device> {
  return toDevice(await httpRequest(endpoints.devices.detail(id), HTTP.GET));
}

export async function createDeviceApi(input: { serialNumber: string; firmwareVersion: string }): Promise<DeviceCreateResult> {
  return httpRequest(endpoints.devices.create, HTTP.POST, input);
}

export async function updateDeviceApi(id: string, input: { firmwareVersion?: string; status?: string }): Promise<Device> {
  return toDevice(await httpRequest(endpoints.devices.update(id), HTTP.PUT, input));
}

export async function assignDeviceApi(id: string, userId: string): Promise<Device> {
  return toDevice(await httpRequest(endpoints.devices.assign(id), HTTP.POST, { userId }));
}

export async function unassignDeviceApi(id: string): Promise<Device> {
  return toDevice(await httpRequest(endpoints.devices.unassign(id), HTTP.POST));
}

export async function claimDeviceApi(claimCode: string): Promise<Device> {
  return toDevice(await httpRequest(endpoints.devices.claim, HTTP.POST, { claimCode }));
}

export async function rotateDeviceKeyApi(id: string): Promise<RotatedDeviceKey> {
  return httpRequest(endpoints.devices.rotateKey(id), HTTP.PATCH);
}

export async function createProvisioningTokenApi(serialNumber?: string): Promise<ProvisioningToken> {
  return httpRequest(endpoints.devices.provisioningTokens, HTTP.POST, serialNumber ? { serialNumber } : {});
}
