import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteMeApi, getMeApi, updateMeApi, verifyPasswordApi } from '../../user-device/api/account.api';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import { useLang } from '../../../shared/i18n/LanguageContext';
import { useAuth } from '../model/AuthContext';
import { paths } from '../../../app/router/paths';

export function MySecurityPage() {
  const { logout } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void getMeApi().then((me) => setCurrentEmail(me.email)).catch(() => {});
  }, []);

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      toast({ type: 'error', title: 'Correo inválido', msg: 'Revisa el nuevo correo.' });
      return;
    }
    if (currentPassword !== confirmPassword) {
      toast({ type: 'error', title: 'No coinciden', msg: 'La contraseña y su confirmación deben ser iguales.' });
      return;
    }
    setBusy(true);
    try {
      await verifyPasswordApi(currentPassword);
      const me = await updateMeApi({ email: newEmail.trim().toLowerCase() });
      setCurrentEmail(me.email);
      setNewEmail('');
      setCurrentPassword('');
      setConfirmPassword('');
      toast({ type: 'success', title: 'Correo actualizado', msg: 'Revisa tu nuevo correo para verificarlo.' });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo cambiar el correo', msg: getUserMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    setDeleting(true);
    try {
      await deleteMeApi();
      await logout();
      navigate(paths.public.home, { replace: true });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo eliminar', msg: getUserMessage(error) });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <section className="module-page user-page">
      <header className="page-header user-page-header">
        <div>
          <h1>{t('sec.title')}</h1>
          <p>{t('sec.subtitle')}</p>
        </div>
      </header>

      <div className="account-layout account-layout-2">
        <section className="account-card">
          <h2>{t('sec.emailTitle')}</h2>
          <p className="muted">{currentEmail || '—'}</p>
          <form className="device-form" style={{ marginTop: 12 }} onSubmit={(e) => void changeEmail(e)}>
            <label>{t('sec.newEmail')}
              <input required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nuevo@correo.com" autoComplete="email" />
            </label>
            <label>{t('sec.currentPass')}
              <input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
            </label>
            <label>{t('sec.confirmPass')}
              <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
            </label>
            <div>
              <button className="device-button primary" type="submit" disabled={busy}>
                {busy ? t('sec.verifying') : t('sec.changeBtn')}
              </button>
            </div>
          </form>
        </section>

        <section className="account-card account-danger">
          <h2>{t('sec.deleteTitle')}</h2>
          <p className="muted">{t('sec.deleteHint')}</p>
          {!confirmDelete ? (
            <button type="button" className="account-danger-btn" onClick={() => setConfirmDelete(true)}>{t('sec.deleteBtn')}</button>
          ) : (
            <div className="account-confirm">
              <p className="muted">{t('sec.deleteConfirm')}</p>
              <div className="account-confirm-actions">
                <button type="button" className="account-outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>{t('sec.cancel')}</button>
                <button type="button" className="account-danger-btn" disabled={deleting} onClick={() => void removeAccount()}>
                  {deleting ? t('sec.deleting') : t('sec.confirmDelete')}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
