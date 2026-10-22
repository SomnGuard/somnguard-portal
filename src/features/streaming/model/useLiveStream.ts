import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints } from '../../../shared/api/endpoints';
import { getStreamSessionApi, startStreamApi, stopStreamApi } from '../api/stream.api';

export type LivePhase = 'idle' | 'starting' | 'live' | 'stopping' | 'error';
export type NetQuality = 'verde' | 'amarillo' | 'rojo' | 'gris';

interface UseLiveStreamOpts {
  deviceId: string;
  autoCloseOnNavigate?: boolean;
}

/**
 * HU-PORTAL-005: Ver en vivo con RTCPeerConnection nativo + WS /ws/stream.
 * Fase 1 (sin SFU real): valida REST start/session/stop + handshake WS + PC.
 * El video queda negro hasta que el Pi publique; el panel muestra cada paso.
 */
export function useLiveStream({ deviceId, autoCloseOnNavigate = true }: UseLiveStreamOpts) {
  const [phase, setPhase] = useState<LivePhase>('idle');
  const [sessionId, setSessionId] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [pcState, setPcState] = useState<string>('new');
  const [wsState, setWsState] = useState<string>('closed');
  const [quality, setQuality] = useState<NetQuality>('gris');
  const [error, setError] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [frames, setFrames] = useState(0);
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);

  const pushLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-29), `${new Date().toLocaleTimeString()} ${msg}`]);
  }, []);

  const cleanup = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* noop */ }
    wsRef.current = null;
    try { pcRef.current?.close(); } catch { /* noop */ }
    pcRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setWsState('closed');
    setPcState('closed');
  }, []);

  const connectSignaling = useCallback((sid: string, wsUrl: string) => {
    const url = wsUrl || endpoints.stream.ws;
    if (!url) {
      pushLog('WS sin URL (revisa VITE_API_URL/VITE_STREAM_WS_URL)');
      return;
    }
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setWsState('connecting');
      ws.onopen = () => {
        setWsState('open');
        setQuality('verde');
        pushLog(`WS open ${url}`);
        ws.send(JSON.stringify({ type: 'subscribe', session_id: sid }));
      };
      ws.onclose = () => { setWsState('closed'); pushLog('WS closed'); };
      ws.onerror = () => {
        setQuality('rojo');
        pushLog(`WS error (${url}). Si la API no se reconstruyó con feat/hu-012-dev, haz: docker compose --env-file .env up -d --build`);
      };
      ws.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === 'frame' && typeof msg.data === 'string') {
            if (imgRef.current) imgRef.current.src = msg.data.startsWith('data:') ? msg.data : `data:image/jpeg;base64,${msg.data}`;
            setFrames((f) => f + 1);
            setQuality('verde');
            return;
          }
          if (msg.type === 'offer' && msg.sdp && pcRef.current) {
            await pcRef.current.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', session_id: sid, sdp: answer.sdp }));
            pushLog('SDP offer->answer');
          } else if (msg.type === 'ice' && msg.candidate && pcRef.current) {
            await pcRef.current.addIceCandidate(msg.candidate);
          } else {
            pushLog(`WS msg ${msg.type ?? '?'}`);
          }
        } catch (e) {
          pushLog(`WS msg inválido: ${(e as Error).message}`);
        }
      };
    } catch (e) {
      pushLog(`WS no soportado: ${(e as Error).message}`);
    }
  }, [pushLog]);

  const start = useCallback(async () => {
    if (!deviceId) { setError('Falta deviceId'); return; }
    if (startingRef.current) { pushLog('start ignorado: ya en curso (StrictMode)'); return; }
    startingRef.current = true;
    setError('');
    setPhase('starting');
    pushLog(`POST start ${deviceId}`);
    const setupLive = (sid: string, wsUrl: string) => {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.ontrack = (e) => {
        if (videoRef.current) videoRef.current.srcObject = e.streams[0];
        setQuality('verde');
        pushLog('track remoto recibido');
      };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        setPcState(st);
        setQuality(st === 'connected' ? 'verde' : st === 'connecting' ? 'amarillo' : 'rojo');
        pushLog(`PC ${st}`);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ice', session_id: sid, candidate: e.candidate }));
        }
      };
      connectSignaling(sid, wsUrl);
    };
    try {
      const s = await startStreamApi(deviceId);
      setSessionId(s.sessionId);
      setRoom(s.room);
      pushLog(`Sesión ${s.sessionId} room=${s.room} exp=${s.expiresAt}`);
      setupLive(s.sessionId, s.wsUrl);
      setPhase('live');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar';
      if (/existe una sesi|activa/i.test(msg)) {
        pushLog(`start 409: reutilizo sesión existente`);
        try {
          const existing = await getStreamSessionApi(deviceId);
          if (!existing) throw new Error('Sin sesión');
          setSessionId(existing.sessionId);
          setRoom(existing.room);
          pushLog(`GET session ok ${existing.sessionId} viewers=${existing.viewerCount}`);
          setupLive(existing.sessionId, endpoints.stream.ws);
          setPhase('live');
          setError('');
          return;
        } catch (e2) {
          pushLog(`GET session falló: ${(e2 as Error).message}`);
        }
      }
      setError(msg);
      setPhase('error');
      setQuality('rojo');
      pushLog(`start falló: ${msg}`);
      cleanup();
    } finally {
      startingRef.current = false;
    }
  }, [deviceId, pushLog, cleanup, connectSignaling]);

  const stop = useCallback(async () => {
    if (stoppingRef.current) return;
    if (phase !== 'live' && phase !== 'error' && phase !== 'starting') return;
    stoppingRef.current = true;
    setPhase('stopping');
    pushLog('POST stop');
    try {
      await stopStreamApi(deviceId, sessionId || undefined);
    } catch (e) {
      pushLog(`stop falló (idempotente): ${(e as Error).message}`);
    }
    cleanup();
    setSessionId('');
    setPhase('idle');
    stoppingRef.current = false;
  }, [phase, deviceId, sessionId, pushLog, cleanup]);

  useEffect(() => {
    if (!autoCloseOnNavigate) return;
    return () => { // AC-003: auto-cierre si navega fuera (desmonta)
      try { wsRef.current?.close(); } catch { /* noop */ }
      try { pcRef.current?.close(); } catch { /* noop */ }
    };
  }, [autoCloseOnNavigate]);

  return { phase, sessionId, room, pcState, wsState, quality, error, log, videoRef, imgRef, frames, start, stop };
}
