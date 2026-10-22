import { useEffect, useRef } from 'react';
import { useLiveStream } from '../model/useLiveStream';

interface Props {
  deviceId: string;
  onClose: () => void;
}

/**
 * HU-PORTAL-005 AC-001/002/003: modal con player WebRTC + controles.
 * Controles: play/pause, fullscreen, mute, cerrar. Auto-cierre al navegar fuera.
 */
export function LiveStreamModal({ deviceId, onClose }: Props) {
  const { phase, sessionId, room, pcState, wsState, quality, error, log, videoRef, imgRef, frames, start, stop } =
    useLiveStream({ deviceId });
  const boxRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
  }, [start]);
  useEffect(() => () => { void stopRef.current(); }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };
  const goFullscreen = () => {
    const el = boxRef.current as unknown as { requestFullscreen?: () => Promise<void> } | null;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => {});
  };

  const dot = quality === 'verde' ? '#22c55e' : quality === 'amarillo' ? '#eab308' : quality === 'rojo' ? '#ef4444' : '#9ca3af';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Video en vivo">
      <div className="modal-card" ref={boxRef}>
        <header className="modal-head">
          <div>
            <h2>En vivo · {deviceId.slice(0, 8)}</h2>
            <p className="muted">room={room || '…'} · pc={pcState} · ws={wsState} · fase={phase}</p>
          </div>
          <span className="net-dot" title={`calidad ${quality}`} style={{ background: dot }} />
        </header>
        <video ref={videoRef} autoPlay playsInline muted controls={false} className="live-video" style={{ display: frames > 0 ? 'none' : 'block' }} />
        <img ref={imgRef} alt="En vivo del device" className="live-video" style={{ display: frames > 0 ? 'block' : 'none', width: '100%' }} />
        {phase === 'starting' && <p className="muted">Negociando sesión…</p>}
        {phase === 'live' && frames === 0 && (
          <p className="muted">Sesión lista. Esperando frames del Pi: corre el publicador (ver guía) con este deviceId.</p>
        )}
        {frames > 0 && <p className="muted">Recibiendo video MJPEG ({frames} frames) — WebRTC real en fase 2.</p>}
        {error && <p className="error">Error: {error}</p>}
        {!sessionId && phase === 'live' && (
          <p className="muted">Sin frame aún: el Pi publica cuando recibe wants-view y está Activo.</p>
        )}
        <div className="modal-actions">
          <button type="button" onClick={togglePlay}>play/pause</button>
          <button type="button" onClick={goFullscreen}>fullscreen</button>
          <button type="button" onClick={toggleMute}>mute</button>
          <button type="button" onClick={() => { void stop(); onClose(); }}>cerrar</button>
        </div>
        <details className="live-log">
          <summary>Diagnóstico ({log.length})</summary>
          <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </details>
      </div>
    </div>
  );
}
