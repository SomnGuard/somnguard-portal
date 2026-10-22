import { useEffect, useState } from 'react';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import { listDevicesApi, type Device } from '../api/devices.api';
import { getDeviceConfigApi, getDeviceConfigStatusApi, requestDeviceConfigRefreshApi, updateDeviceConfigApi, type DeviceConfig, type DeviceConfigStatus } from '../api/device-config.api';

export function DeviceConfigPage() {
  const toast = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<DeviceConfigStatus | null>(null);
  const [json, setJson] = useState('{}');
  const [reason, setReason] = useState('');
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
    void Promise.all([getDeviceConfigApi(deviceId), getDeviceConfigStatusApi(deviceId)]).then(([nextConfig, nextStatus]) => {
      if (cancelled) return;
      setConfig(nextConfig);
      setConfigStatus(nextStatus);
      setJson(JSON.stringify(nextConfig.configurationEntries ?? {}, null, 2));
    }).catch((error) => {
      if (!cancelled) toast({ type: 'error', title: 'No se pudo consultar la configuración', msg: getUserMessage(error) });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deviceId, toast]);

  const save = async () => {
    if (!deviceId) return;
    let parsed: unknown;
    try { parsed = JSON.parse(json); }
    catch { toast({ type: 'error', title: 'JSON inválido', msg: 'Corrige la estructura antes de guardar.' }); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast({ type: 'error', title: 'Configuración inválida', msg: 'La configuración debe ser un objeto JSON.' }); return;
    }
    setSaving(true);
    try {
      await updateDeviceConfigApi(deviceId, parsed as Record<string, unknown>, reason);
      toast({ type: 'success', title: 'Configuración actualizada', msg: 'El dispositivo recibirá la nueva versión cuando sincronice.' });
      setReason('');
      const [nextConfig, nextStatus] = await Promise.all([getDeviceConfigApi(deviceId), getDeviceConfigStatusApi(deviceId)]);
      setConfig(nextConfig); setConfigStatus(nextStatus); setJson(JSON.stringify(nextConfig.configurationEntries ?? {}, null, 2));
    } catch (error) { toast({ type: 'error', title: 'No se pudo guardar', msg: getUserMessage(error) }); }
    finally { setSaving(false); }
  };

  const refresh = async () => {
    if (!deviceId) return;
    setSaving(true);
    try {
      await requestDeviceConfigRefreshApi(deviceId);
      toast({ type: 'success', title: 'Actualización solicitada', msg: 'Se solicitó al dispositivo que consulte su configuración.' });
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
        <button className="device-button secondary" type="button" disabled={!deviceId || saving} onClick={() => void refresh()}>Solicitar actualización</button>
      </div>
      {!deviceId && !loading ? <div className="simple-panel"><p>No hay dispositivos disponibles.</p></div> : null}
      {deviceId ? <>
        <div className="admin-config-stats">
          <article><span>Versión publicada</span><strong>{config?.version ?? '—'}</strong></article>
          <article><span>Versión aplicada</span><strong>{configStatus?.appliedVersion ?? '—'}</strong></article>
          <article><span>Estado</span><strong className={configStatus?.pending || configStatus?.outdated ? 'needs-update' : ''}>{configStatus?.pending || configStatus?.outdated ? 'Pendiente de sincronizar' : loading ? 'Consultando…' : 'Al día'}</strong></article>
          <article><span>Última descarga</span><strong>{config?.lastConfigPullAt ? new Date(config.lastConfigPullAt).toLocaleString() : 'Sin dato'}</strong></article>
        </div>
        <section className="admin-config-editor">
          <div className="admin-config-editor-head"><div><h2>Parámetros del dispositivo</h2><p>La API recibe <code>configuration</code> como objeto JSON y un motivo opcional de hasta 200 caracteres.</p></div><span>{config?.sources ? 'Valores efectivos' : 'Edición directa'}</span></div>
          {config?.sources && Object.keys(config.sources).length > 0 ? <div className="admin-config-sources">Fuentes: {Object.entries(config.sources).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</div> : null}
          <textarea className="admin-config-json" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} aria-label="Configuración JSON" />
          <label className="admin-config-reason">Motivo del cambio (opcional)<input maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Ajuste de umbral de detección" /></label>
          <div className="admin-config-actions"><span>{loading ? 'Cargando…' : `ID: ${deviceId}`}</span><button className="device-button primary" disabled={!config || saving} onClick={() => void save()}>{saving ? 'Procesando…' : 'Guardar configuración'}</button></div>
        </section>
      </> : null}
    </section>
  );
}
