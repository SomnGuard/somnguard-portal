import { useEffect, useMemo, useState } from 'react';
import { SomnguardLogoStatic } from '../../../shared/ui/SomnguardLogo';
import {
  getPasswordStrength,
  sanitizePasswordNoSpaces,
  validateResetPassword,
} from '../../../shared/lib/validation';
import { useToast } from '../../../shared/ui/Toast';
import { ApiError, getUserMessage, mapDetailsToFieldErrors } from '../../../shared/api/errors';

type Props = {
  initialToken?: string;
  onReset: (token: string, newPassword: string) => Promise<void>;
  onBack: () => void;
  onSuccess?: () => void;
};

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2" /><path d="M9.9 5.1A10.7 10.7 0 0112 4c5.5 0 9.4 4.5 10 8-.3 1.8-1.5 3.9-3.2 5.6" /><path d="M14.8 14.8A3 3 0 019.2 9.2" /><path d="M3.8 9.3C2.2 10.9 1 12 1 12c.6 3.5 4.5 8 11 8 1.7 0 3.2-.4 4.6-1" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3.5" /></svg>
  );
}

export function ResetPasswordPage({ initialToken = '', onReset, onBack, onSuccess }: Props) {
  // Fallback: si App no pasó token pero la URL sí trae ?token=, leerlo aquí directamente (fix para ?token perdido por navigate/replaceState)
  const getTokenFromUrl = () => {
    const s = new URLSearchParams(window.location.search);
    let t = s.get('token') || s.get('resetToken') || s.get('reset_token');
    if (t) return t;
    if (window.location.hash.includes('?')) {
      const h = new URLSearchParams(window.location.hash.split('?')[1] || '');
      t = h.get('token') || h.get('resetToken') || h.get('reset_token');
      if (t) return t;
    }
    return '';
  };

  const [token, setToken] = useState(() => (initialToken || getTokenFromUrl()).trim());
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirm?: string }>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const toast = useToast();

  const hasToken = token.length > 0;
  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  // Sincroniza si Appactualiza initialToken y limpia la URL para no exponer el token
  useEffect(() => {
    if (initialToken && initialToken !== token) setToken(initialToken.trim());
  }, [initialToken]);

  useEffect(() => {
    if (hasToken) {
      // Limpia el query del navegador tras capturarlo (evita que quede en historial)
      const url = new URL(window.location.href);
      const hadToken = url.searchParams.has('token') || url.searchParams.has('resetToken') || url.searchParams.has('reset_token');
      if (hadToken) {
        url.searchParams.delete('token');
        url.searchParams.delete('resetToken');
        url.searchParams.delete('reset_token');
        const clean = url.pathname + (url.search ? `?${url.searchParams.toString()}` : '') + url.hash.split('?')[0];
        window.history.replaceState({}, '', clean || '/reset-password');
      } else if (window.location.hash.includes('token')) {
        const baseHash = window.location.hash.split('?')[0];
        window.history.replaceState({}, '', window.location.pathname + window.location.search + baseHash);
      }
    }
  }, [hasToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSuccess('');

    if (!hasToken) {
      setApiError('El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.');
      return;
    }

    const nt = { token: true, newPassword: true, confirm: true };
    setTouched(nt);
    const { valid, errors: v } = validateResetPassword(token, newPassword, confirm);
    if (!valid) {
      setErrors({ newPassword: v.newPassword, confirm: v.confirm });
      if (v.token) setApiError(v.token);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onReset(token, newPassword);
      setSuccess('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
      toast({ title: 'Contraseña actualizada', msg: 'Tu contraseña fue restablecida. Inicia sesión.', type: 'success' });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBack();
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // token inválido / expirado / ya usado -> mensaje específico
        const isTokenError =
          err.details.some((d) => d.field === 'token') ||
          err.message.toLowerCase().includes('token') ||
          err.message.toLowerCase().includes('expirado') ||
          err.message.toLowerCase().includes('inválido') ||
          err.code === 'BAD_REQUEST';

        if (isTokenError) {
          setApiError('El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.');
          return;
        }

        const fieldErrors = mapDetailsToFieldErrors(err.details);
        const mapped: typeof errors = {};
        if (fieldErrors.newPassword || fieldErrors.new_password) mapped.newPassword = fieldErrors.newPassword ?? fieldErrors.new_password;
        if (Object.keys(mapped).length > 0) {
          setErrors((prev) => ({ ...prev, ...mapped }));
          setApiError('');
        } else {
          setApiError(getUserMessage(err));
        }
      } else {
        setApiError(getUserMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Sin token -> enlace inválido
  if (!hasToken) {
    return (
      <section className="verify-page" aria-label="Restablecer contraseña - enlace inválido">
        <div className="verify-container">
          <div className="verify-card">
            <div className="modal-logo" style={{ marginBottom: 16 }}>
              <SomnguardLogoStatic size={80} />
            </div>
            <h1 className="verify-title">Enlace no válido</h1>
            <p className="verify-subtitle">
              El enlace de recuperación no es válido o ha expirado.
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Solicita un nuevo enlace desde “¿Olvidaste tu contraseña?”</span>
            </p>
            <div className="form-error" style={{ display: 'block', marginTop: 12 }} role="alert">
              No se pudo obtener el token de recuperación desde la URL.
            </div>
            <button className="btn-submit" onClick={onBack} style={{ marginTop: 16 }}>
              Volver al inicio de sesión
            </button>
            <div className="modal-links" style={{ marginTop: 16 }}>
              <p>
                <button className="modal-link accent" onClick={onBack}>Solicitar nuevo enlace</button>
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="verify-page" aria-label="Restablecer contraseña - pantalla completa">
      <div className="verify-container">
        <div className="verify-card">
          <div className="modal-logo" style={{ marginBottom: 16 }}>
            <SomnguardLogoStatic size={80} />
          </div>
          <h1 className="verify-title">Restablecer contraseña</h1>
          <p className="verify-subtitle">
            Crea tu nueva contraseña.
            <br />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Token obtenido automáticamente del enlace. Expira en 1 hora.</span>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* token se mantiene interno, no se pide al usuario */}
            <div className="form-group">
              <label className="form-label" htmlFor="resetNewPassword">Nueva contraseña *</label>
              <div className="password-wrap">
                <input
                  id="resetNewPassword"
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.newPassword ? 'input-invalid' : touched.newPassword && newPassword && !errors.newPassword ? 'input-valid' : ''}`}
                  value={newPassword}
                  onChange={(e) => {
                    const v = sanitizePasswordNoSpaces(e.target.value);
                    setNewPassword(v);
                    if (touched.newPassword || touched.confirm) {
                      const { errors: ev } = validateResetPassword(token, v, confirm);
                      setErrors((p) => ({ ...p, newPassword: touched.newPassword ? ev.newPassword : undefined, confirm: touched.confirm ? ev.confirm : undefined }));
                    }
                  }}
                  onBlur={() => {
                    const nt = { ...touched, newPassword: true };
                    setTouched(nt);
                    const { errors: ev } = validateResetPassword(token, newPassword, confirm);
                    setErrors((p) => ({ ...p, newPassword: ev.newPassword }));
                  }}
                  placeholder="Mín. 8 caracteres, mayúscula, número y símbolo"
                  required
                  autoComplete="new-password"
                  autoFocus
                />
                <button type="button" className="password-toggle" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Ocultar' : 'Mostrar'}>
                  <EyeIcon off={showPass} />
                </button>
              </div>
              <div className="field-error">{errors.newPassword || ''}</div>
              {newPassword.length > 0 && (
                <div className="strength" aria-hidden>
                  <div className="strength-bar"><div className="strength-fill" style={{ width: `${strength.percent}%`, background: strength.color }} /></div>
                  <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
              {!errors.newPassword && <div className="field-hint">8-72 caracteres, mayúscula, minúscula, número y símbolo, sin espacios.</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="resetConfirm">Confirmar contraseña *</label>
              <div className="password-wrap">
                <input
                  id="resetConfirm"
                  type={showConfirm ? 'text' : 'password'}
                  className={`form-input ${errors.confirm ? 'input-invalid' : touched.confirm && confirm && !errors.confirm ? 'input-valid' : ''}`}
                  value={confirm}
                  onChange={(e) => {
                    const v = sanitizePasswordNoSpaces(e.target.value);
                    setConfirm(v);
                    if (touched.confirm || touched.newPassword) {
                      const { errors: ev } = validateResetPassword(token, newPassword, v);
                      setErrors((p) => ({ ...p, confirm: touched.confirm ? ev.confirm : undefined }));
                    }
                  }}
                  onBlur={() => {
                    const nt = { ...touched, confirm: true };
                    setTouched(nt);
                    const { errors: ev } = validateResetPassword(token, newPassword, confirm);
                    setErrors((p) => ({ ...p, confirm: ev.confirm }));
                  }}
                  placeholder="Repite la nueva contraseña"
                  required
                  autoComplete="new-password"
                />
                <button type="button" className="password-toggle" onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
                  <EyeIcon off={showConfirm} />
                </button>
              </div>
              <div className="field-error">{errors.confirm || ''}</div>
            </div>

            {apiError && <div className="form-error" style={{ display: 'block', marginTop: 8 }} role="alert">{apiError}</div>}
            {success && <div className="form-success" role="status" style={{ marginTop: 8 }}>{success}</div>}

            <button type="submit" className="btn-submit" disabled={submitting} style={{ marginTop: 8 }}>
              {submitting && <span className="spinner" aria-hidden />}
              {submitting ? 'Actualizando...' : 'Restablecer contraseña'}
            </button>
          </form>

          <div className="modal-links" style={{ marginTop: 20 }}>
            <p>
              <button className="modal-link accent" onClick={onBack}>Volver al inicio de sesión</button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
