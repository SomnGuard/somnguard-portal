import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import {
  assignDeviceApi,
  claimDeviceApi,
  createDeviceApi,
  createProvisioningTokenApi,
  getDeviceApi,
  listDevicesApi,
  rotateDeviceKeyApi,
  unassignDeviceApi,
  updateDeviceApi,
  type Device,
  type DeviceCreateResult,
  type DevicePage,
  type ProvisioningToken,
  type RotatedDeviceKey,
} from '../api/devices.api';

type Dialog = 'create' | 'edit' | 'assign' | 'claim' | 'token' | 'details' | null;
const EMPTY_PAGE: DevicePage = { data: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } };

function date(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? '—' : parsed.toLocaleString();
}

export function DeviceListPage() {
  const toast = useToast();
  const [result, setResult] = useState<DevicePage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<Device | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState('');
  const [deviceStatus, setDeviceStatus] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [provisionSerial, setProvisionSerial] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<DeviceCreateResult | null>(null);
  const [rotatedKey, setRotatedKey] = useState<RotatedDeviceKey | null>(null);
  const [provisionToken, setProvisionToken] = useState<ProvisioningToken | null>(null);

  const load = useCallback(async (nextPage = page, nextStatus = status) => {
    setLoading(true);
    try {
      setResult(await listDevicesApi({ page: nextPage, pageSize: 20, status: nextStatus || undefined }));
    } catch (error) {
      toast({ type: 'error', title: 'No se pudieron cargar los dispositivos', msg: getUserMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [page, status, toast]);

  useEffect(() => { void load(); }, [load]);

  const open = (next: Dialog, device?: Device) => {
    setSelected(device ?? null);
    setCreatedCredentials(null);
    setRotatedKey(null);
    setProvisionToken(null);
    setSerialNumber(device?.serialNumber ?? '');
    setFirmwareVersion(device?.firmwareVersion ?? '');
    setDeviceStatus(device?.status ?? '');
    setAssignedUserId('');
    setClaimCode('');
    setProvisionSerial('');
    setDialog(next);
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast({ type: 'success', title: 'Listo', msg: success });
      await load();
      return true;
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo completar la acción', msg: getUserMessage(error) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialog === 'create') {
      setBusy(true);
      try {
        setCreatedCredentials(await createDeviceApi({ serialNumber: serialNumber.trim(), firmwareVersion: firmwareVersion.trim() }));
        toast({ type: 'success', title: 'Dispositivo creado', msg: 'Guarda las credenciales ahora; la API Key solo se muestra al crear.' });
        await load(1);
      } catch (error) {
        toast({ type: 'error', title: 'No se pudo crear el dispositivo', msg: getUserMessage(error) });
      } finally { setBusy(false); }
      return;
    }
    if (dialog === 'edit' && selected) {
      const ok = await run(() => updateDeviceApi(selected.id, { firmwareVersion: firmwareVersion.trim(), status: deviceStatus.trim() }), 'Se actualizaron los datos del dispositivo.');
      if (ok) setDialog(null);
    }
    if (dialog === 'assign' && selected) {
      const ok = await run(() => assignDeviceApi(selected.id, assignedUserId.trim()), 'Se asignó el dispositivo al usuario.');
      if (ok) setDialog(null);
    }
    if (dialog === 'claim') {
      const ok = await run(() => claimDeviceApi(claimCode.trim()), 'El dispositivo quedó asociado a tu cuenta.');
      if (ok) setDialog(null);
    }
    if (dialog === 'token') {
      setBusy(true);
      try {
        setProvisionToken(await createProvisioningTokenApi(provisionSerial.trim() || undefined));
      } catch (error) {
        toast({ type: 'error', title: 'No se pudo generar el token', msg: getUserMessage(error) });
      } finally { setBusy(false); }
    }
  };

  const showDetails = async (device: Device) => {
    setSelected(device);
    setDialog('details');
    try { setSelected(await getDeviceApi(device.id)); }
    catch (error) { toast({ type: 'error', title: 'No se pudo cargar el detalle', msg: getUserMessage(error) }); }
  };

  const rotateKey = async () => {
    if (!selected) return;
    setBusy(true);
    try { setRotatedKey(await rotateDeviceKeyApi(selected.id)); }
    catch (error) { toast({ type: 'error', title: 'No se pudo renovar la API Key', msg: getUserMessage(error) }); }
    finally { setBusy(false); }
  };

  const filter = (event: FormEvent) => { event.preventDefault(); setPage(1); void load(1, status); };
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast({ type: 'success', title: 'Copiado', msg: 'El valor quedó en el portapapeles.' }); }
    catch { toast({ type: 'info', title: 'Copia manual', msg: 'Selecciona y copia el valor mostrado.' }); }
  };

  return (
    <section className="device-module">
      <div className="device-toolbar">
        <form className="device-filter" onSubmit={filter}>
          <label htmlFor="device-status">Estado</label>
          <select id="device-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option><option value="DEVICE_ACTIVE">Activo</option><option value="DEVICE_OFFLINE">Desconectado</option><option value="DEVICE_PENDING">Pendiente</option>
          </select>
          <button className="device-button secondary" type="submit">Filtrar</button>
        </form>
        <div className="device-actions">
          <button className="device-button secondary" onClick={() => open('claim')}>Vincular por código</button>
          <button className="device-button secondary" onClick={() => open('token')}>Token de aprovisionamiento</button>
          <button className="device-button primary" onClick={() => open('create')}>＋ Registrar dispositivo</button>
        </div>
      </div>

      <div className="device-table-wrap">
        <table className="device-table">
          <thead><tr><th>Dispositivo</th><th>Estado</th><th>Firmware</th><th>Asignación</th><th>Último contacto</th><th>Acciones</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="device-table-message">Cargando dispositivos…</td></tr> : null}
            {!loading && result.data.length === 0 ? <tr><td colSpan={6} className="device-table-message">No hay dispositivos para mostrar.</td></tr> : null}
            {!loading && result.data.map((device) => (
              <tr key={device.id}>
                <td><strong>{device.serialNumber || 'Sin número de serie'}</strong><small>{device.id}</small></td>
                <td><span className={`device-status ${device.statusCategory?.toLowerCase() || device.status.toLowerCase()}`}>{device.status || '—'}</span></td>
                <td>{device.firmwareVersion || '—'}</td>
                <td>{device.assignedUserId ? <span title={device.assignedUserId}>Asignado · {device.assignedUserId.slice(0, 8)}…</span> : 'Sin asignar'}</td>
                <td>{date(device.lastHeartbeatAt)}</td>
                <td><div className="device-row-actions">
                  <button onClick={() => void showDetails(device)}>Detalle</button>
                  <button onClick={() => open('edit', device)}>Editar</button>
                  {device.assignedUserId ? <button onClick={() => void run(() => unassignDeviceApi(device.id), 'Se liberó el dispositivo.')}>Desasignar</button> : <button onClick={() => open('assign', device)}>Asignar</button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="device-pagination">
        <span>{result.pagination.totalItems} dispositivos · página {result.pagination.page} de {Math.max(result.pagination.totalPages, 1)}</span>
        <div><button className="device-button secondary" disabled={page <= 1 || loading} onClick={() => { const next = page - 1; setPage(next); void load(next); }}>Anterior</button><button className="device-button secondary" disabled={page >= result.pagination.totalPages || loading} onClick={() => { const next = page + 1; setPage(next); void load(next); }}>Siguiente</button></div>
      </div>

      {dialog ? <div className="device-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
        <section className="device-modal" role="dialog" aria-modal="true" aria-labelledby="device-modal-title">
          <button className="device-modal-close" onClick={() => setDialog(null)} aria-label="Cerrar">×</button>
          <h2 id="device-modal-title">{{ create: 'Registrar dispositivo', edit: 'Editar dispositivo', assign: 'Asignar dispositivo', claim: 'Vincular dispositivo', token: 'Token de aprovisionamiento', details: 'Detalle del dispositivo' }[dialog]}</h2>
          {dialog === 'details' && selected ? <div className="device-detail-grid">
            <span>Serie</span><strong>{selected.serialNumber || '—'}</strong><span>ID</span><strong>{selected.id}</strong><span>Estado</span><strong>{selected.status || '—'}</strong><span>Firmware</span><strong>{selected.firmwareVersion || '—'}</strong><span>Usuario asignado</span><strong>{selected.assignedUserId || 'Sin asignar'}</strong><span>IP reciente</span><strong>{selected.lastSeenIp || '—'}</strong><span>Último heartbeat</span><strong>{date(selected.lastHeartbeatAt)}</strong><span>Versión aplicada</span><strong>{selected.appliedConfigVersion ?? '—'}</strong><span>Configuración pendiente</span><strong>{selected.pendingConfigUpdate ? 'Sí' : 'No'}</strong>
            {rotatedKey ? <><span>Nueva API Key</span><strong className="device-secret">{rotatedKey.apiKey}<button onClick={() => void copy(rotatedKey.apiKey)}>Copiar</button></strong></> : null}
            <button className="device-button secondary device-modal-action" disabled={busy} onClick={() => void rotateKey()}>Rotar API Key</button>
          </div> : null}
          {['create', 'edit', 'assign', 'claim', 'token'].includes(dialog) ? <form className="device-form" onSubmit={(e) => void submit(e)}>
            {dialog === 'create' || dialog === 'edit' ? <>
              <label>Número de serie<input required maxLength={100} value={serialNumber} disabled={dialog === 'edit'} onChange={(e) => setSerialNumber(e.target.value)} /></label>
              <label>Versión de firmware<input required maxLength={50} value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} /></label>
              {dialog === 'edit' ? <label>Estado<input required maxLength={50} value={deviceStatus} onChange={(e) => setDeviceStatus(e.target.value)} /></label> : null}
            </> : null}
            {dialog === 'assign' ? <label>ID de usuario (UUID)<input required value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label> : null}
            {dialog === 'claim' ? <label>Código de vinculación<input required value={claimCode} onChange={(e) => setClaimCode(e.target.value)} /></label> : null}
            {dialog === 'token' ? <label>Número de serie (opcional)<input maxLength={100} value={provisionSerial} onChange={(e) => setProvisionSerial(e.target.value)} /></label> : null}
            {dialog === 'create' && createdCredentials ? <div className="device-secret-box"><strong>Guarda las credenciales; no volverán a mostrarse.</strong><span>API Key: {createdCredentials.apiKey || 'No incluida en la respuesta'}</span>{createdCredentials.apiKey ? <button type="button" onClick={() => void copy(createdCredentials.apiKey!)}>Copiar API Key</button> : null}<span>Código de vinculación: {createdCredentials.claimCode || '—'}</span>{createdCredentials.claimCode ? <button type="button" onClick={() => void copy(createdCredentials.claimCode!)}>Copiar código</button> : null}</div> : null}
            {dialog === 'token' && provisionToken ? <div className="device-secret-box"><strong>Token generado · máximo {provisionToken.maxUses ?? '—'} usos</strong><span>{provisionToken.token}</span><small>Expira: {date(provisionToken.expiresAt)}</small><button type="button" onClick={() => void copy(provisionToken.token)}>Copiar token</button></div> : null}
            {dialog !== 'create' || !createdCredentials ? <button className="device-button primary" type="submit" disabled={busy}>{busy ? 'Procesando…' : dialog === 'create' ? 'Crear dispositivo' : dialog === 'edit' ? 'Guardar cambios' : dialog === 'assign' ? 'Asignar' : dialog === 'claim' ? 'Vincular' : 'Generar token'}</button> : <button className="device-button primary" type="button" onClick={() => setDialog(null)}>Cerrar</button>}
          </form> : null}
        </section>
      </div> : null}
    </section>
  );
}
