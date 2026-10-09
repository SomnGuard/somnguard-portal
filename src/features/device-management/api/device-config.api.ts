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

export interface DeviceConfigUpdate {
  deviceId: string;
  version: number;
  updatedAt: string;
}

export function getDeviceConfigApi(id: string) {
  return httpRequest<DeviceConfig>(endpoints.devices.config(id), HTTP.GET);
}

export function getDeviceConfigStatusApi(id: string) {
  return httpRequest<DeviceConfigStatus>(endpoints.devices.configStatus(id), HTTP.GET);
}

export function updateDeviceConfigApi(id: string, configuration: Record<string, unknown>, changeReason?: string) {
  return httpRequest<DeviceConfigUpdate>(endpoints.devices.config(id), HTTP.PATCH, {
    configuration,
    ...(changeReason?.trim() ? { changeReason: changeReason.trim() } : {}),
  });
}

export function requestDeviceConfigRefreshApi(id: string) {
  return httpRequest<Record<string, unknown>>(endpoints.devices.configRefresh(id), HTTP.POST);
}
