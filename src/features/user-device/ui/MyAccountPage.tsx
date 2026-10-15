import { useEffect, useState, type FormEvent } from 'react';
import { claimDeviceApi, listDevicesApi, unassignDeviceApi, type Device } from '../../device-management/api/devices.api';
import { getMeApi, updateMeApi } from '../api/account.api';
import { getUserMessage } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/Toast';
import { useAuth } from '../../auth/model/AuthContext';
import { useLang } from '../../../shared/i18n/LanguageContext';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es');
}

export function MyAccountPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimCode, setClaimCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [page, me] = await Promise.all([
        listDevicesApi({ page: 1, pageSize: 5 }),
        getMeApi().catch(() => null),
      ]);
      setDevice(page.data[0] ?? null);
      setFirstName(me?.firstName || user?.firstName || '');
      setLastName(me?.lastName || user?.lastName || '');
      setPhone(me?.phone || user?.phone || '');
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo cargar tu cuenta', msg: getUserMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = claimCode.trim();
    if (!value) return;
    setBusy(true);
    try {
      const linked = await claimDeviceApi(value);
      toast({ type: 'success', title: 'Dispositivo vinculado', msg: `Quedó asociado a tu cuenta (${linked.serialNumber || linked.id.slice(0, 8)}).` });
      setClaimCode('');
      setDevice(linked);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo vincular', msg: getUserMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!device) return;
    setUnlinking(true);
    try {
      await unassignDeviceApi(device.id);
      toast({ type: 'success', title: 'Dispositivo desvinculado', msg: 'Ya puedes vincular otro código.' });
      setDevice(null);
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo desvincular', msg: getUserMessage(error) });
    } finally {
      setUnlinking(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ type: 'error', title: 'Revisa los datos', msg: 'Nombre y apellido son obligatorios.' });
      return;
    }
    setSaving(true);
    try {
      const me = await updateMeApi({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null });
      setFirstName(me.firstName || '');
      setLastName(me.lastName || '');
      setPhone(me.phone || '');
      toast({ type: 'success', title: 'Perfil actualizado', msg: 'Tus datos quedaron guardados.' });
    } catch (error) {
      toast({ type: 'error', title: 'No se pudo guardar', msg: getUserMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="module-page user-page">
      <header className="page-header user-page-header">
        <div>
          <h1>{t('acc.title')}</h1>
          <p>{t('acc.subtitle')}</p>
        </div>
      </header>

      <div className="account-layout">
        <section className="account-card">
          <h2>{t('acc.profile')}</h2>
          <p className="muted">{user?.email || '—'}</p>
          <form className="device-form" style={{ marginTop: 12 }} onSubmit={(e) => void saveProfile(e)}>
            <label>{t('acc.firstName')}
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('acc.firstName')} autoComplete="given-name" />
            </label>
            <label>{t('acc.lastName')}
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('acc.lastName')} autoComplete="family-name" />
            </label>
            <label>{t('acc.phone')}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+51 ..." autoComplete="tel" inputMode="tel" />
            </label>
            <div>
              <button className="device-button primary" type="submit" disabled={saving || loading}>
                {saving ? t('acc.saving') : t('acc.save')}
              </button>
            </div>
          </form>
        </section>

        <section className="account-card">
          <h2>{t('acc.device')}</h2>
          {loading ? <p className="muted">…</p> : null}
          {!loading && !device ? <p className="muted">{t('acc.noDevice')}</p> : null}
          {!loading && device ? (
            <>
              <dl className="account-list">
                <div><dt>{t('acc.serial')}</dt><dd>{device.serialNumber || '—'}</dd></div>
                <div><dt>{t('acc.status')}</dt><dd>{device.status || '—'}</dd></div>
                <div><dt>{t('acc.firmware')}</dt><dd>{device.firmwareVersion || '—'}</dd></div>
                <div><dt>{t('acc.lastContact')}</dt><dd>{fmtDate(device.lastHeartbeatAt)}</dd></div>
              </dl>
              <button type="button" className="account-outline" disabled={unlinking} onClick={() => void unlink()}>
                {unlinking ? t('acc.unlinking') : t('acc.unlink')}
              </button>
            </>
          ) : null}
        </section>

        {!loading && !device ? (
        <section className="account-card">
          <h2>{t('acc.claimTitle')}</h2>
          <p className="muted">{t('acc.claimHint')}</p>
          <form className="device-form" style={{ marginTop: 12 }} onSubmit={(e) => void submitClaim(e)}>
            <label>{t('acc.claimCode')}
              <input
                required
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                placeholder="CLM-..."
                maxLength={20}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div>
              <button className="device-button primary" type="submit" disabled={busy || !claimCode.trim()}>
                {busy ? t('acc.claiming') : t('acc.claimBtn')}
              </button>
            </div>
          </form>
        </section>
        ) : null}
      </div>
    </section>
  );
}
