import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../../app/router/paths';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import { listDevicesApi, type Device } from '../api/devices.api';
import { getDeviceConfigApi, getDeviceConfigStatusApi, requestDeviceConfigRefreshApi, type DeviceConfig, type DeviceConfigStatus } from '../api/device-config.api';

export function DeviceConfigPage() {
  const toast = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<DeviceConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listDevicesApi({ page: 1, pageSize: 100 }).then((result) => {
      if (cancelled) return;
      setDevices(result.data);
      if (result.data[0]) setDeviceId(result.data[0].id);
    }).catch((error) => {
      if (!cancelled) toast({ type: 'error', title: 'No se pudieron cargar los dispositivos', msg: getUserMessage(error) });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  useEffect(() => {
    if (!deviceId) { setConfig(null); setConfigStatus(null); return; }
    let cancelled = false;
    setLoading(true);
    setConfig(null);
    setConfigStatus(null);
    void Promise.all([getDeviceConfigApi(deviceId), getDeviceConfigStatusApi(deviceId)]).then(([nextConfig, nextStatus]) => {
      if (cancelled) return;
      setConfig(nextConfig);
      setConfigStatus(nextStatus);
    }).catch((error) => {
      if (!cancelled) toast({ type: 'error', title: 'No se pudo consultar la configuración', msg: getUserMessage(error) });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deviceId, toast]);

  const refresh = async () => {
    if (!deviceId) return;
    setSaving(true);
    try {
      await requestDeviceConfigRefreshApi(deviceId);
      toast({ type: 'success', title: 'Actualización solicitada', msg: 'El dispositivo consultará la última configuración global en su siguiente sincronización.' });
      setConfigStatus(await getDeviceConfigStatusApi(deviceId));
    } catch (error) { toast({ type: 'error', title: 'No se pudo solicitar la actualización', msg: getUserMessage(error) }); }
    finally { setSaving(false); }
  };

  return (
    <section className="admin-config-page">
      <div className="admin-config-toolbar">
        <label>Dispositivo<select value={deviceId} disabled={loading && devices.length === 0} onChange={(e) => setDeviceId(e.target.value)}>
          <option value="">Selecciona un dispositivo</option>
          {devices.map((device) => <option key={device.id} value={device.id}>{device.serialNumber} · {device.status}</option>)}
        </select></label>
      </div>
      {!deviceId && !loading ? <div className="simple-panel"><p>No hay dispositivos disponibles.</p></div> : null}
      {deviceId ? <>
        <div className="admin-config-stats">
          <article><span>Versión global publicada</span><strong>{config?.version ?? '—'}</strong></article>
          <article><span>Versión aplicada</span><strong>{configStatus?.appliedVersion ?? '—'}</strong></article>
          <article><span>Estado</span><strong className={configStatus?.pending || configStatus?.outdated ? 'needs-update' : ''}>{configStatus?.pending || configStatus?.outdated ? 'Pendiente de sincronizar' : loading ? 'Consultando…' : 'Al día'}</strong></article>
          <article><span>Última descarga</span><strong>{config?.lastConfigPullAt ? new Date(config.lastConfigPullAt).toLocaleString() : 'Sin dato'}</strong></article>
        </div>
        <section className="admin-config-editor">
          <div className="admin-config-editor-head"><div><h2>Configuración efectiva</h2><p>Los parámetros se construyen globalmente desde los catálogos de tipos de evento y patrones sonoros. Para cambiarlos, edita esos catálogos; la API ya no permite guardar JSON directamente por dispositivo.</p></div><span>Solo lectura</span></div>
          {config?.sources && Object.keys(config.sources).length > 0 ? <div className="admin-config-sources">Fuentes: {Object.entries(config.sources).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</div> : null}
          <pre className="admin-config-json" aria-label="Configuración efectiva del dispositivo">{loading ? 'Cargando configuración…' : JSON.stringify(config?.configurationEntries ?? {}, null, 2)}</pre>
          <div className="admin-config-actions"><span>{loading ? 'Cargando…' : `ID: ${deviceId}`}</span><div className="admin-config-action-buttons"><Link className="device-button secondary" to={paths.admin.catalogs}>Editar catálogos globales</Link><button className="device-button primary" type="button" disabled={!config || saving} onClick={() => void refresh()}>{saving ? 'Solicitando…' : 'Solicitar actualización al dispositivo'}</button></div></div>
        </section>
      </> : null}
    </section>
  );
}
