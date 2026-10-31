import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { httpRequest } from '../../../shared/api/client';

export interface DeviceConfig {
  deviceId: string;
  version: number;
  sources?: Record<string, unknown>;
  lastConfigPullAt?: string | null;
  configurationEntries: Record<string, unknown>;
}

export interface DeviceConfigStatus {
  deviceId: string;
  appliedVersion: number;
  availableVersion: number;
  pending: boolean;
  outdated: boolean;
}

type DeviceConfigWire = Record<string, unknown>;

function normalizeDeviceConfig(data: DeviceConfigWire): DeviceConfig {
  const metadata = new Set([
    'deviceId', 'device_id', 'version', 'sources', 'lastConfigPullAt', 'last_config_pull_at',
    'configuration', 'configurationEntries', 'configuration_entries',
  ]);
  const nested = data.configurationEntries ?? data.configuration_entries ?? data.configuration;
  const configurationEntries = nested && typeof nested === 'object' && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : Object.fromEntries(Object.entries(data).filter(([key]) => !metadata.has(key)));
  return {
    deviceId: String(data.deviceId ?? data.device_id ?? ''),
    version: Number(data.version ?? 0),
    sources: (data.sources && typeof data.sources === 'object' ? data.sources : {}) as Record<string, unknown>,
    lastConfigPullAt: (data.lastConfigPullAt ?? data.last_config_pull_at ?? null) as string | null,
    configurationEntries,
  };
}

function normalizeDeviceConfigStatus(data: DeviceConfigWire): DeviceConfigStatus {
  return {
    deviceId: String(data.deviceId ?? data.device_id ?? ''),
    appliedVersion: Number(data.appliedVersion ?? data.applied_version ?? 0),
    availableVersion: Number(data.availableVersion ?? data.available_version ?? 0),
    pending: Boolean(data.pending),
    outdated: Boolean(data.outdated),
  };
}

export async function getDeviceConfigApi(id: string) {
  const data = await httpRequest<DeviceConfigWire>(endpoints.devices.config(id), HTTP.GET);
  return normalizeDeviceConfig(data);
}

export async function getDeviceConfigStatusApi(id: string) {
  const data = await httpRequest<DeviceConfigWire>(endpoints.devices.configStatus(id), HTTP.GET);
  return normalizeDeviceConfigStatus(data);
}

export function requestDeviceConfigRefreshApi(id: string) {
  return httpRequest<Record<string, unknown>>(endpoints.devices.configRefresh(id), HTTP.POST);
}
