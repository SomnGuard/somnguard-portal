import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { endpoints } from '../../../shared/api/endpoints';
import { getDetectionPausedApi, getStreamDeviceApi, getStreamSessionApi, listDevicesApi, setDetectionPausedApi, startStreamApi, stopStreamApi } from '../api/stream.api';

/**
 * HU-PORTAL-005 automático + estado en tiempo real + toggle de cámara.
 * - Sin ID manual: toma tu primer device ACTIVE y abre el vivo solo.
 * - Estado instantáneo por WS {type:status} (no espera el heartbeat 30s).
 * - Botón cámara ON/OFF: OFF cierra la sesión y el Pi deja de enviar frames
 *   (ahorra datos); ON reabre. Caja negra difuminada sin video.
 */
export function AutoLiveBox() {
  const [deviceId, setDeviceId] = useState('');
  const [deviceStatus, setDeviceStatus] = useState('');
  const [frames, setFrames] = useState(0);
  const [note, setNote] = useState('Buscando tu dispositivo…');
  const [camOn, setCamOn] = useState(true);
  const [rtcOn, setRtcOn] = useState(false);
  const [detectPaused, setDetectPaused] = useState(false);
  const rtcStateRef = useRef('new');
  const lkVideoRef = useRef(false);
  const lkRoomRef = useRef<Room | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const camOnRef = useRef(true);
  const runRef = useRef(0);
  const ctrlRef = useRef<{ stop: () => void }>({ stop: () => {} });

  useEffect(() => {
    runRef.current += 1;
    const myRun = runRef.current;
    let ws: WebSocket | null = null;
    let sessionId = '';
    let devId = '';
    let retryTimer: number | null = null;
    let idleTimer: number | null = null;
    const framesRef = { current: 0 };
    const deviceGoneRef = { current: false };
    let cancelled = false;
    let alive = true;

    const log = (m: string) => { if (alive) setNote(m); };

    const closeLiveKit = (only?: Room | null) => {
      const cur = lkRoomRef.current;
      if (only && cur !== only) return;
      try { (only ?? cur)?.disconnect(); } catch { /* noop */ }
      if (!only || cur === only) lkRoomRef.current = null;
    };

    const connectLiveKit = async (url: string, token: string): Promise<boolean> => {
      closeLiveKit();
      return new Promise<boolean>((resolve) => {
        let done = false;
        let room: Room | null = null;
        const isCurrent = () => room !== null && lkRoomRef.current === room;
        const finish = (ok: boolean) => {
          if (done) return;
          done = true;
          window.clearTimeout(to);
          // Solo toca la room si sigue siendo la vigente: un evento tardío
          // de un intento viejo no debe matar la conexión nueva.
          if (!ok && room !== null) {
            try { room.disconnect(); } catch { /* noop */ }
            if (lkRoomRef.current === room) lkRoomRef.current = null;
          }
          resolve(ok);
        };
        const to = window.setTimeout(() => finish(false), 10000);
        try {
          room = new Room({ adaptiveStream: true });
          lkRoomRef.current = room;
          room
            .on(RoomEvent.Connected, () => {
              if (!isCurrent()) return;
              rtcStateRef.current = 'connected';
              if (alive) log('LiveKit conectado, esperando video…');
              finish(true);
            })
            .on(RoomEvent.TrackSubscribed, (track) => {
              if (!isCurrent()) return;
              if (track.kind === Track.Kind.Video && videoRef.current) {
                try {
                  track.attach(videoRef.current);
                } catch { /* noop */ }
                rtcStateRef.current = 'connected';
                lkVideoRef.current = true;
                if (alive) { setRtcOn(true); log('Video por LiveKit SFU'); }
                finish(true);
              }
            })
            .on(RoomEvent.TrackUnsubscribed, (track) => {
              if (!isCurrent()) return;
              if (track.kind === Track.Kind.Video) {
                rtcStateRef.current = 'new';
                lkVideoRef.current = false;
                if (alive) { setRtcOn(false); log('Track perdido, reintentando…'); }
              }
            })
            .on(RoomEvent.Reconnecting, () => {
              if (isCurrent() && alive) log('Reconectando LiveKit…');
            })
            .on(RoomEvent.Reconnected, () => {
              if (!isCurrent()) return;
              rtcStateRef.current = 'connected';
              if (alive) log('LiveKit reconectado');
            })
            .on(RoomEvent.Disconnected, () => {
              if (!isCurrent()) return;
              rtcStateRef.current = 'new';
              if (alive) setRtcOn(false);
              finish(framesRef.current > 0);
            });
          void room.connect(url, token).catch(() => finish(false));
        } catch {
          finish(false);
        }
      });
    };

    const connect = async (): Promise<boolean> => {
      if (!camOnRef.current) return false;
      if (!devId) {
        try {
          const devices = await listDevicesApi();
          const active = devices.find((d) => d.status === 'DEVICE_ACTIVE') ?? devices[0];
          if (!active) { log('Sin dispositivos asignados. Asigna uno para ver el vivo.'); return false; }
          devId = active.id;
          if (alive) {
            setDeviceId(devId);
            setDeviceStatus(active.status);
          }
          try {
            const p = await getDetectionPausedApi(devId);
            if (alive) setDetectPaused(p);
          } catch { /* conserva estado local */ }
          if (active.status !== 'DEVICE_ACTIVE') {
            log(`Device ${devId.slice(0, 8)} en ${active.status}: el vivo necesita ACTIVO.`);
          }
        } catch (e) {
          log(`No pude listar devices: ${(e as Error).message}`);
          return false;
        }
      }
      // Estado fresco: si no está ACTIVO no se intenta sesión (evita 404/409 en bucle).
      try {
        const d = await getStreamDeviceApi(devId);
        if (alive) setDeviceStatus(d.status);
        if (d.status !== 'DEVICE_ACTIVE') {
          deviceGoneRef.current = true;
          log(`Device ${d.status}: enciende el Pi y espera el heartbeat. Reintento solo.`);
          return false;
        }
      } catch (e) {
        log(`Sin acceso al device: ${(e as Error).message}`);
        return false;
      }
      deviceGoneRef.current = false;
      // Sesión: reutiliza si existe (null = no hay, crea sin ruido).
      let lkUrl: string | undefined;
      let lkToken: string | undefined;
      const existing = await getStreamSessionApi(devId);
      if (existing) {
        sessionId = existing.sessionId;
        lkUrl = existing.livekitUrl;
        lkToken = existing.livekitToken;
      } else {
        try {
          const s = await startStreamApi(devId);
          sessionId = s.sessionId;
          lkUrl = s.livekitUrl;
          lkToken = s.livekitToken;
        } catch (e) {
          log(`Esperando al device ${(e as Error).message}`);
          return false;
        }
      }
      if (!camOnRef.current) return false;
      // Fase 2: SFU LiveKit con tope 4s (si no conecta ya, el relay es más rápido).
      if (lkUrl && lkToken) {
        const ok = await Promise.race([
          connectLiveKit(lkUrl, lkToken),
          new Promise<boolean>((r) => window.setTimeout(() => r(false), 4000)),
        ]);
        if (ok) return true;
        log('LiveKit lento, sigue relay…');
      }
      return new Promise<boolean>((resolve) => {
        try {
          ws = new WebSocket(endpoints.stream.ws);
        } catch {
          resolve(false);
          return;
        }
        const to = window.setTimeout(() => { try { ws?.close(); } catch { /* noop */ } resolve(false); }, 20000);
        ws.onopen = () => {
          log('Conectado, esperando video…');
          ws?.send(JSON.stringify({ type: 'subscribe', session_id: sessionId }));
          ws?.send(JSON.stringify({ type: 'request-offer', session_id: sessionId }));
          if (devId) ws?.send(JSON.stringify({ type: 'subscribe-status', device_id: devId }));
        };
        ws.onclose = () => { window.clearTimeout(to); resolve(framesRef.current > 0); };
        ws.onerror = () => { window.clearTimeout(to); resolve(false); };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string);
            if (msg.type === 'status' && typeof msg.status === 'string') {
              if (alive) {
                setDeviceStatus(msg.status);
                if (msg.status !== 'DEVICE_ACTIVE') log(`Device en ${msg.status}: video pausado.`);
              }
              return;
            }
            if (msg.type === 'offer' && typeof msg.sdp === 'string') {
              void (async () => {
                try {
                  if (!pcRef.current) {
                    const pc = new RTCPeerConnection();
                    pcRef.current = pc;
                    pc.ontrack = (e) => {
                      if (videoRef.current) videoRef.current.srcObject = e.streams[0];
                      if (alive) { setRtcOn(true); log('WebRTC H.264 conectado'); }
                    };
                    pc.onconnectionstatechange = () => {
                      rtcStateRef.current = pc.connectionState;
                      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                        if (alive) { setRtcOn(false); log('WebRTC caído, renegociando…'); }
                        try { ws?.close(); } catch { /* fuerza ciclo limpio de reconexión */ }
                      }
                    };
                    pc.onicecandidate = (e) => {
                      if (e.candidate && ws?.readyState === WebSocket.OPEN) {
                        ws?.send(JSON.stringify({ type: 'ice', session_id: sessionId, candidate: e.candidate }));
                      }
                    };
                  }
                  const pc = pcRef.current;
                  await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  ws?.send(JSON.stringify({ type: 'answer', session_id: sessionId, sdp: answer.sdp }));
                  log('Offer→answer WebRTC');
                } catch (e) {
                  log(`WebRTC falló, sigue MJPEG: ${(e as Error).message}`);
                }
              })();
              return;
            }
            if (msg.type === 'ice' && msg.candidate && pcRef.current) {
              void pcRef.current.addIceCandidate(msg.candidate).catch(() => {});
              return;
            }
            if (msg.type === 'frame' && typeof msg.data === 'string') {
              window.clearTimeout(to);
              if (imgRef.current) {
                imgRef.current.src = msg.data.startsWith('data:')
                  ? msg.data
                  : `data:image/jpeg;base64,${msg.data}`;
              }
              framesRef.current += 1;
              if (alive) setFrames(framesRef.current);
              resolve(true);
            }
          } catch { /* ignora parciales */ }
        };
      });
    };

    const loop = async () => {
      let backoff = 1500;
      let tracklessJoins = 0;
      const sleep = (ms: number) => new Promise((r) => { retryTimer = window.setTimeout(r, ms); });
      const runAlive = () => alive && !cancelled && runRef.current === myRun;
      const transportHealthy = () =>
        String(lkRoomRef.current?.state) === 'connected' ||
        rtcStateRef.current === 'connected' ||
        ws?.readyState === WebSocket.OPEN;
      while (runAlive()) {
        if (!camOnRef.current) {
          await sleep(2000);
          continue;
        }
        const ok = await connect();
        if (!runAlive()) break;
        // Room sin track = Pi no publica: avisa en vez de ciclar a ciegas.
        if (ok && rtcStateRef.current === 'connected' && framesRef.current === 0 && !lkVideoRef.current) {
          tracklessJoins += 1;
          if (tracklessJoins >= 2 && alive) {
            log('Conectado a LiveKit pero el Pi no publica video. Revisa el Pi (sesión, streaming, LiveKit).');
          }
        } else if (ok) {
          tracklessJoins = 0;
        }
        if (ok) {
          // Vigila sin reconectar: solo se re-conecta si se degrada.
          let seen = framesRef.current;
          for (;;) {
            await new Promise((r) => { idleTimer = window.setTimeout(r, 12000); });
            if (!runAlive()) break;
            const freshFrames = framesRef.current !== seen;
            seen = framesRef.current;
            if (transportHealthy() || freshFrames) {
              backoff = 1500;
              continue;
            }
            if (alive) log('Señal congelada, reintentando conexión…');
            try { ws?.close(); } catch { /* noop */ }
            break;
          }
          if (!runAlive()) break;
        }
        if (deviceGoneRef.current) {
          await sleep(15000);
          backoff = 1500;
          continue;
        }
        await sleep(backoff);
        backoff = Math.min(15000, backoff * 2);
      }
    };

    const stopAll = () => {
      cancelled = true;
      alive = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (idleTimer) window.clearTimeout(idleTimer);
      try { ws?.close(); } catch { /* noop */ }
      try { pcRef.current?.close(); } catch { /* noop */ }
      pcRef.current = null;
      rtcStateRef.current = 'new';
      lkVideoRef.current = false;
      try { lkRoomRef.current?.disconnect(); } catch { /* noop */ }
      lkRoomRef.current = null;
      if (alive) setRtcOn(false);
      if (devId) void stopStreamApi(devId, sessionId || undefined).catch(() => {});
    };
    ctrlRef.current = { stop: stopAll };

    void loop();
    return () => { stopAll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresca la pausa real del servidor: si la API se reinició pierde el flag
  // en memoria y el botón quedaría mintiendo.
  useEffect(() => {
    if (!deviceId) return;
    let dead = false;
    const id = window.setInterval(() => {
      void getDetectionPausedApi(deviceId)
        .then((p) => { if (!dead) setDetectPaused(p); })
        .catch(() => {});
    }, 15000);
    return () => { dead = true; window.clearInterval(id); };
  }, [deviceId]);

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    camOnRef.current = next;
    if (!next) {
      setFrames(0);
      setRtcOn(false);
      rtcStateRef.current = 'new';
      try { lkRoomRef.current?.disconnect(); } catch { /* noop */ }
      lkRoomRef.current = null;
      if (imgRef.current) imgRef.current.src = '';
      if (videoRef.current) videoRef.current.srcObject = null;
      setNote('Cámara apagada desde aquí: el Pi dejó de enviar frames (ahorra datos).');
      if (deviceId) void stopStreamApi(deviceId).catch(() => {});
    } else {
      setNote('Encendiendo cámara…');
    }
  };

  const toggleDetection = () => {
    if (!deviceId) return;
    const next = !detectPaused;
    setDetectPaused(next);
    setNote(next ? 'Pausando detección en el Pi…' : 'Reanudando detección…');
    void setDetectionPausedApi(deviceId, next)
      .then((applied) => {
        setDetectPaused(applied);
        setNote(applied
          ? 'Detección pausada: no detecta ni suena hasta reanudar o reiniciar.'
          : 'Detección reanudada.');
      })
      .catch((e: Error) => {
        setDetectPaused(!next);
        setNote(`No se aplicó: ${e.message}`);
      });
  };

  const hasVideo = (frames > 0 || rtcOn) && camOn;
  const systemActive = deviceStatus === 'DEVICE_ACTIVE';
  const dot = !deviceId ? '#9ca3af' : systemActive ? '#22c55e' : '#eab308';

  return (
    <div className="simple-panel user-auto-live-card">
      <p className="muted">
        <span className="net-dot" title={deviceStatus || 'buscando'} style={{ background: dot, display: 'inline-block', width: 10, height: 10, borderRadius: '50%', marginRight: 6 }} />
        {!deviceId ? 'Buscando dispositivo…' : systemActive ? 'Sistema activo' : 'Sistema inactivo'}
      </p>
      <div
        className="live-box"
        style={{
          position: 'relative', width: '100%', maxWidth: 640, margin: '0 auto',
          aspectRatio: '4 / 3',
          background: '#000', borderRadius: 12, overflow: 'hidden',
        }}
      >
        {!hasVideo && (
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexDirection: 'column', gap: 8,
              background: 'radial-gradient(ellipse at center, #111827 0%, #000 70%)',
              filter: 'blur(0.5px)',
            }}
          >
            <div className="state-icon">◌</div>
            <p className="muted">{note}</p>
          </div>
        )}
        <img
          ref={imgRef}
          alt="Video en vivo del device"
          style={{ display: hasVideo && !rtcOn ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: hasVideo && rtcOn ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div className="row" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button type="button" onClick={toggleCam} disabled={!deviceId}>
          {camOn ? 'Apagar cámara' : 'Encender cámara'}
        </button>
        <button type="button" onClick={toggleDetection} disabled={!deviceId}>
          {detectPaused ? 'Reanudar detección' : 'Pausar detección'}
        </button>
      </div>
      {detectPaused && <p className="muted" style={{ marginTop: 8 }}>Detección pausada en el Pi: no se despausa sola, solo con reanudar o reinicio.</p>}
      {!hasVideo && camOn && <p className="muted" style={{ marginTop: 8 }}>{note}</p>}
      {!camOn && <p className="muted" style={{ marginTop: 8 }}>Apagada: sin sesión en backend, el Pi no gasta datos ni CPU en video.</p>}
    </div>
  );
}
