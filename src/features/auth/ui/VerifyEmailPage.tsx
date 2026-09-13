import { useRef, useState } from 'react';
import { SomnguardLogoStatic } from '../../../shared/ui/SomnguardLogo';
import { sanitizeCode, validateVerifyCode } from '../../../shared/lib/validation';
import { useToast } from '../../../shared/ui/Toast';
import { ApiError, getUserMessage, mapDetailsToFieldErrors } from '../../../shared/api/errors';

type Props = {
  initialEmail?: string;
  onVerify: (code: string) => Promise<void>;
  onBack: () => void;
  onSuccess?: () => void;
};

export function VerifyEmailPage({ initialEmail = '', onVerify, onBack, onSuccess }: Props) {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ code?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const toast = useToast();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const arr = code.split('');
    // ensure length 6 array
    while (arr.length < 6) arr.push('');
    arr[index] = digit;
    const next = sanitizeCode(arr.join(''));
    setCode(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.length === 6) setErrors({});
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = sanitizeCode(e.clipboardData.getData('text'));
    if (pasted) {
      setCode(pasted);
      const idx = Math.min(pasted.length, 6) - 1;
      if (idx >= 0) inputsRef.current[idx]?.focus();
      if (pasted.length === 6) setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSuccess('');

    const { valid, errors: v } = validateVerifyCode(code);
    if (!valid) {
      setErrors(v);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onVerify(code);
      setSuccess('Correo verificado correctamente. Ya puedes iniciar sesión.');
      toast({ title: 'Verificado', msg: 'Correo verificado. Inicia sesión para continuar.', type: 'success' });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else onBack();
      }, 1400);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.details.length > 0) {
        const fieldErrors = mapDetailsToFieldErrors(err.details);
        // backend puede devolver field "token" o "code"
        const codeErr = fieldErrors.code || fieldErrors.token;
        if (codeErr) {
          setErrors({ code: codeErr });
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

  return (
    <section className="verify-page" aria-label="Verificar correo - pantalla completa">
      <div className="verify-container">
        <div className="verify-card">
          <div className="modal-logo" style={{ marginBottom: 16 }}>
            <SomnguardLogoStatic size={80} />
          </div>
          <h1 className="verify-title">Verifica tu correo</h1>
          <p className="verify-subtitle">
            Ingresa el código de 6 dígitos que enviamos a <strong style={{ color: 'var(--text)' }}>{initialEmail || 'tu correo'}</strong>.
            <br />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Expira en 15 minutos. Revisa spam si no lo ves.</span>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="code-0">Código de verificación *</label>
              <div className="otp-grid" onPaste={handlePaste} role="group" aria-label="Código de 6 dígitos">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    id={i === 0 ? 'code-0' : undefined}
                    ref={(el) => { inputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={code[i] || ''}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={(e) => e.target.select()}
                    className={`form-input otp-input ${errors.code ? 'input-invalid' : code.length === 6 ? 'input-valid' : ''}`}
                    aria-label={`Dígito ${i + 1}`}
                  />
                ))}
              </div>
              <div className="field-error" id="codeError">{errors.code || ''}</div>
              {!errors.code && <div className="field-hint">Solo números, 6 dígitos. Pegar el código también funciona.</div>}
              {apiError && <div className="form-error" style={{ display: 'block', marginTop: 8 }} role="alert">{apiError}</div>}
              {success && <div className="form-success" role="status" style={{ marginTop: 8 }}>{success}</div>}
            </div>

            <button type="submit" className="btn-submit" disabled={submitting || code.length !== 6} style={{ marginTop: 8 }}>
              {submitting && <span className="spinner" aria-hidden />}
              {submitting ? 'Verificando...' : 'Verificar correo'}
            </button>
          </form>

          <div className="modal-links" style={{ marginTop: 20 }}>
            <p>
              <button className="modal-link accent" onClick={onBack}>Volver al inicio</button>
            </p>
            <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 13 }}>
              ¿No recibiste el código? Revisa spam o solicita reenvío desde tu correo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
