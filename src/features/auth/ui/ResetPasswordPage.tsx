import { useMemo, useState } from 'react';
import { SomnguardLogoStatic } from '../../../shared/ui/SomnguardLogo';
import {
  getPasswordStrength,
  sanitizePasswordNoSpaces,
  validateResetPassword,
} from '../../../shared/lib/validation';
import { useToast } from '../../../shared/ui/Toast';
import { ApiError, getUserMessage, mapDetailsToFieldErrors } from '../../../shared/api/errors';

type Props = {
  code: string;
  email?: string;
  onReset: (code: string, newPassword: string) => Promise<void>;
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

function mapResetError(err: ApiError): { apiError?: string; fieldErrors?: Record<string,string> } {
  const msg = (err.message || '').toLowerCase();
  const detailsStr = err.details.map((d) => `${d.field} ${d.issue}`.toLowerCase()).join(' ');
  const combined = `${msg} ${detailsStr}`;

  // token/code errors
  const isTokenField = err.details.some((d) => ['token','code'].includes(d.field.toLowerCase()));
  const isCodeMsg = combined.includes('código') || combined.includes('codigo') || combined.includes('token') || combined.includes('code');

  if (isTokenField || isCodeMsg) {
    if (combined.includes('expir')) {
      return { apiError: 'El código ha expirado. Solicita un nuevo código.' };
    }
    if (combined.includes('ya no es válido') || combined.includes('utilizado') || combined.includes('usado') || combined.includes('consumido') || combined.includes('invalid') && combined.includes('used')) {
      return { apiError: 'Este código ya no es válido. Solicita un nuevo código.' };
    }
    if (combined.includes('incorrecto') || combined.includes('inválido') || combined.includes('invalido') || err.status === 400) {
      // prioriza campo si es 400
      if (err.status === 400) return { apiError: 'El código ingresado es incorrecto o ha expirado.' };
    }
  }

  // si es error de validación de contraseña, mapear a campo
  const fieldErrors = mapDetailsToFieldErrors(err.details);
  const mapped: Record<string,string> = {};
  if (fieldErrors.newPassword || fieldErrors.new_password) mapped.newPassword = fieldErrors.newPassword ?? fieldErrors.new_password;
  if (fieldErrors.password) mapped.newPassword = fieldErrors.password;
  if (fieldErrors.confirm) mapped.confirm = fieldErrors.confirm;

  if (Object.keys(mapped).length > 0) {
    return { fieldErrors: mapped };
  }

  // código inválido genérico por status
  if (err.status === 400 && (isTokenField || isCodeMsg)) {
    return { apiError: 'El código ingresado es incorrecto o ha expirado.' };
  }

  return { apiError: getUserMessage(err) };
}

export function ResetPasswordPage({ code, email, onReset, onBack, onSuccess }: Props) {
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

  const hasCode = code.trim().length === 6 && /^\d{6}$/.test(code.trim());
  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSuccess('');

    if (!code.trim()) {
      setApiError('Este código ya no es válido. Solicita un nuevo código.');
      return;
    }

    const nt = { token: true, newPassword: true, confirm: true };
    setTouched(nt);
    const { valid, errors: v } = validateResetPassword(code, newPassword, confirm);
    if (!valid) {
      setErrors({ newPassword: v.newPassword, confirm: v.confirm });
      if (v.token) setApiError('Este código ya no es válido. Solicita un nuevo código.');
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onReset(code.trim(), newPassword);
      setSuccess('Tu contraseña se actualizó correctamente. Debes iniciar sesión nuevamente.');
      toast({ title: 'Contraseña actualizada', msg: 'Tu contraseña se actualizó correctamente.', type: 'success' });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBack();
      }, 1400);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const mapped = mapResetError(err);
        if (mapped.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...mapped.fieldErrors }));
          if (mapped.apiError) setApiError(mapped.apiError);
        } else if (mapped.apiError) {
          // si es error de token/código, no asignar a campo sino a apiError
          const lower = mapped.apiError.toLowerCase();
          if (lower.includes('código') || lower.includes('codigo') || lower.includes('token')) {
            setApiError(mapped.apiError);
          } else {
            setApiError(mapped.apiError);
          }
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

  // Sin código -> estado inválido (flujo no iniciado correctamente)
  if (!code.trim()) {
    return (
      <section className="verify-page" aria-label="Restablecer contraseña - código no válido">
        <div className="verify-container">
          <div className="verify-card">
            <div className="modal-logo" style={{ marginBottom: 16 }}>
              <SomnguardLogoStatic size={80} />
            </div>
            <h1 className="verify-title">Código no válido</h1>
            <p className="verify-subtitle">
              Este código ya no es válido. Solicita un nuevo código.
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Debes iniciar el flujo desde “¿Olvidaste tu contraseña?”</span>
            </p>
            <div className="form-error" style={{ display: 'block', marginTop: 12 }} role="alert">
              No se pudo obtener el código de recuperación. Solicita un nuevo código.
            </div>
            <button className="btn-submit" onClick={onBack} style={{ marginTop: 16 }}>
              Volver al inicio de sesión
            </button>
            <div className="modal-links" style={{ marginTop: 16 }}>
              <p>
                <button className="modal-link accent" onClick={onBack}>Solicitar nuevo código</button>
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Si el código no cumple formato 6 dígitos, avisar (no debería pasar si vino de verify)
  if (!hasCode) {
    return (
      <section className="verify-page" aria-label="Restablecer contraseña - código inválido">
        <div className="verify-container">
          <div className="verify-card">
            <div className="modal-logo" style={{ marginBottom: 16 }}>
              <SomnguardLogoStatic size={80} />
            </div>
            <h1 className="verify-title">Código no válido</h1>
            <p className="verify-subtitle">
              El código ingresado es incorrecto.
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Debe ser un código de 6 dígitos.</span>
            </p>
            <button className="btn-submit" onClick={onBack} style={{ marginTop: 16 }}>
              Solicitar nuevo código
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="verify-page" aria-label="Restablecer contraseña - establecer nueva contraseña">
      <div className="verify-container">
        <div className="verify-card">
          <div className="modal-logo" style={{ marginBottom: 16 }}>
            <SomnguardLogoStatic size={80} />
          </div>
          <h1 className="verify-title">Restablecer contraseña</h1>
          <p className="verify-subtitle">
            Crea tu nueva contraseña.
            {email ? (
              <>
                <br />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Código verificado para <strong style={{ color: 'var(--text)' }}>{email}</strong>. Expira en 15 minutos.</span>
              </>
            ) : (
              <>
                <br />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Ingresa tu nueva contraseña. Expira en 15 minutos.</span>
              </>
            )}
          </p>

          <form onSubmit={handleSubmit} noValidate>
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
                      const { errors: ev } = validateResetPassword(code, v, confirm);
                      setErrors((p) => ({ ...p, newPassword: touched.newPassword ? ev.newPassword : undefined, confirm: touched.confirm ? ev.confirm : undefined }));
                    }
                  }}
                  onBlur={() => {
                    const nt = { ...touched, newPassword: true };
                    setTouched(nt);
                    const { errors: ev } = validateResetPassword(code, newPassword, confirm);
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
                      const { errors: ev } = validateResetPassword(code, newPassword, v);
                      setErrors((p) => ({ ...p, confirm: touched.confirm ? ev.confirm : undefined }));
                    }
                  }}
                  onBlur={() => {
                    const nt = { ...touched, confirm: true };
                    setTouched(nt);
                    const { errors: ev } = validateResetPassword(code, newPassword, confirm);
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
