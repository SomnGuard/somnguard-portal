import { useState } from 'react';
import {
  dismissPermissionBanner,
  getBrowserNotifyPermission,
  isPermissionBannerDismissed,
  requestBrowserNotifyPermission,
} from '../api/browserNotify';

/**
 * Banner "activar notificaciones" (HU-API-009).
 * Replica el aviso típico al entrar a una página: pide el permiso del
 * navegador una sola vez; si se deniega o se pospone, no se insiste.
 */
export function NotificationPermissionBanner({ onGranted }: { onGranted?: () => void }) {
  const [state, setState] = useState(getBrowserNotifyPermission());
  const [hidden, setHidden] = useState(isPermissionBannerDismissed);
  if (hidden || state !== 'default') return null;

  const handleLater = () => {
    dismissPermissionBanner();
    setHidden(true);
  };

  const handleEnable = async () => {
    const result = await requestBrowserNotifyPermission();
    setState(result);
    if (result === 'granted') {
      onGranted?.();
    } else {
      dismissPermissionBanner();
      setHidden(true);
    }
  };

  return (
    <div className="simple-panel notif-perm-banner user-notif-perm" role="dialog" aria-label="Activar notificaciones">
      <strong>Activa las notificaciones</strong>
      <p>Te avisaremos aquí mismo aunque estés en otra pestaña cuando tu dispositivo detecte un evento crítico.</p>
      <button onClick={() => void handleEnable()}>Activar notificaciones</button>{' '}
      <button onClick={handleLater}>Ahora no</button>
    </div>
  );
}
