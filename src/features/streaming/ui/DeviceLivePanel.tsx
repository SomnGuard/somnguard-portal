import { useState } from 'react';
import { endpoints } from '../../../shared/api/endpoints';
import { checkBackendHealth, getStreamDeviceApi, getStreamSessionApi } from '../../streaming/api/stream.api';
import { LiveStreamModal } from '../../streaming/ui/LiveStreamModal';

/** Panel vivo reutilizable: dashboard + mi-dispositivo usan el mismo. */
export function DeviceLivePanel({ title }: { title: string }) {
  const [deviceId, setDeviceId] = useState('');
  const [open, setOpen] = useState(false);
  const [diag, setDiag] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const push = (msg: string) =>
    setDiag((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()} ${msg}`]);

  const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId.trim());

  const runChecks = async () => {
    setChecking(true);
    setDiag([]);
    push(`API=${String(import.meta.env.VITE_API_URL ?? '(sin VITE_API_URL)')} WS=${endpoints.stream.ws || '(sin WS)'}`);
    const health = await checkBackendHealth();
    let deviceOk = false;
    if (!health.ok) {
      push(`Health -> FALLO (${health.status}). OJO: Brave suele bloquear /actuator/health; si Device responde abajo, ignora esto.`);
    } else {
      push(`Health -> OK (${health.status})`);
    }
    if (!looksUuid) {
      push('Pega el UUID real del device (con “SG-0042” el backend responde 4xx).');
      setChecking(false);
      return;
    }
    try {
      const d = await getStreamDeviceApi(deviceId.trim());
      deviceOk = true;
      push(`Device -> status=${d.status} assigned=${d.assignedUserId ?? '-'} hb=${d.lastHeartbeatAt ?? '-'}`);
      if (d.status !== 'DEVICE_ACTIVE') push('OJO: necesita DEVICE_ACTIVE. Si está OFFLINE, el vivo da 409.');
    } catch (e) {
      push(`Device falló: ${(e as Error).message}`);
    }
    if (deviceOk && !health.ok) {
      push('API responde bien aunque Health falle: ignora el Health, es el navegador bloqueándolo.');
    }
    try {
      const s = await getStreamSessionApi(deviceId.trim());
      if (s) push(`Sesión activa -> ${s.sessionId} room=${s.room}`);
      else push('Sin sesión activa (normal al abrir).');
    } catch (e) {
      push(`Sin sesión activa: ${(e as Error).message}`);
    }
    setChecking(false);
  };

  return (
    <div className="simple-panel">
      <h2>{title}</h2>
      <div className="row">
        <label htmlFor="liveDeviceId">Device ID: </label>
        <input
          id="liveDeviceId"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="p. ej. 550e8400-e29b-41d4-a716-446655440000"
          style={{ minWidth: 300 }}
        />
      </div>
      <div className="row" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setOpen(true)} disabled={!looksUuid}>
          Ver en vivo
        </button>
        <button type="button" onClick={() => void runChecks()} disabled={checking}>
          {checking ? 'Verificando…' : 'Verificar conexión'}
        </button>
      </div>
      {!looksUuid && deviceId.length > 0 && (
        <p className="muted">Ese ID no es UUID, el backend lo va a rechazar.</p>
      )}
      {diag.length > 0 && (
        <ul className="live-log">{diag.map((d, i) => <li key={i}>{d}</li>)}</ul>
      )}
      {open && looksUuid && <LiveStreamModal deviceId={deviceId.trim()} onClose={() => setOpen(false)} />}
    </div>
  );
}
