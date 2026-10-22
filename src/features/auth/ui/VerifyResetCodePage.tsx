import { useRef, useState } from 'react';
import { SomnguardLogoStatic } from '../../../shared/ui/SomnguardLogo';
import { sanitizeCode, validateVerifyCode } from '../../../shared/lib/validation';
import { useToast } from '../../../shared/ui/Toast';
import { ApiError, getUserMessage, mapDetailsToFieldErrors } from '../../../shared/api/errors';

type Props = {
  email?: string;
  onVerify: (code: string) => Promise<void>;
  onBack: () => void;
  onSuccess: (code: string) => void;
  onResend?: () => void;
};

function getCodeErrorMessage(err: ApiError): string {
  const msg = (err.message || '').toLowerCase();
  const detailsMsg = err.details.map((d) => `${d.field} ${d.issue}`.toLowerCase()).join(' ');

  const combined = `${msg} ${detailsMsg}`;

  if (combined.includes('expir')) {
    return 'El código ha expirado. Solicita un nuevo código.';
  }
  if (combined.includes('ya no es válido') || combined.includes('utilizado') || combined.includes('usado') || combined.includes('consumido') || combined.includes('invalid') && combined.includes('used')) {
    return 'Este código ya no es válido. Solicita un nuevo código.';
  }
  if (combined.includes('incorrecto') || combined.includes('inválido') || combined.includes('invalido') || combined.includes('no coincide') || msg.includes('bad_request')) {
    // genérico incorrecto si no es expiración
    if (err.status === 400) return 'El código ingresado es incorrecto o ha expirado.';
  }
  if (err.status === 400) return 'El código ingresado es incorrecto o ha expirado.';
  return getUserMessage(err);
}

export function VerifyResetCodePage({ email = '', onVerify, onBack, onSuccess, onResend }: Props) {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ code?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const toast = useToast();
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const arr = code.split('');
    while (arr.length < 6) arr.push('');
    arr[index] = digit;
    const next = sanitizeCode(arr.join(''));
    setCode(next);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.length === 6) setErrors({});
    if (apiError) setApiError('');
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
      if (apiError) setApiError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    const { valid, errors: v } = validateVerifyCode(code);
    if (!valid) {
      setErrors(v);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onVerify(code);
      toast({ title: 'Código válido', msg: 'Código verificado correctamente.', type: 'success' });
      onSuccess(code);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.details.length > 0) {
          const fieldErrors = mapDetailsToFieldErrors(err.details);
          const codeErr = fieldErrors.code || fieldErrors.token;
          if (codeErr) {
            const lower = codeErr.toLowerCase();
            if (lower.includes('expir')) {
              setErrors({ code: 'El código ha expirado. Solicita un nuevo código.' });
            } else if (lower.includes('utilizado') || lower.includes('ya no es válido') || lower.includes('usado')) {
              setErrors({ code: 'Este código ya no es válido. Solicita un nuevo código.' });
            } else {
              setErrors({ code: 'El código ingresado es incorrecto.' });
            }
            setApiError('');
          } else {
            const friendly = getCodeErrorMessage(err);
            setErrors({ code: friendly });
            setApiError('');
          }
        } else {
          const friendly = getCodeErrorMessage(err);
          // mostrar asociado al campo code para cumplir spec
          setErrors({ code: friendly });
        }
      } else {
        setApiError(getUserMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="verify-page" aria-label="Verificación de código de recuperación">
      <div className="verify-container">
        <div className="verify-card">
          <div className="modal-logo" style={{ marginBottom: 16 }}>
            <SomnguardLogoStatic size={80} />
          </div>
          <h1 className="verify-title">Verificar código</h1>
          <p className="verify-subtitle">
            Ingresa el código de 6 dígitos que enviamos a <strong style={{ color: 'var(--text)' }}>{email || 'tu correo'}</strong>.
            <br />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Expira en 15 minutos. Revisa spam si no lo ves.</span>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="code-0">Código de recuperación *</label>
              <div className="otp-grid" onPaste={handlePaste} role="group" aria-label="Código de 6 dígitos">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    id={i === 0 ? 'code-0' : undefined}
                    ref={(el) => { inputsRef.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
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
              {!errors.code && <div className="field-hint">Solo números, 6 dígitos. Solo números, sin letras ni símbolos.</div>}
              {apiError && <div className="form-error" style={{ display: 'block', marginTop: 8 }} role="alert">{apiError}</div>}
            </div>

            <button type="submit" className="btn-submit" disabled={submitting || code.length !== 6} style={{ marginTop: 8 }}>
              {submitting && <span className="spinner" aria-hidden />}
              {submitting ? 'Verificando...' : 'Verificar código'}
            </button>
          </form>

          <div className="modal-links" style={{ marginTop: 20 }}>
            <p>
              <button className="modal-link accent" onClick={onBack}>Volver al inicio de sesión</button>
            </p>
            {onResend && (
              <p style={{ marginTop: 10 }}>
                <button className="modal-link accent" onClick={onResend}>Solicitar nuevo código</button>
              </p>
            )}
            <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 13 }}>
              ¿No recibiste el código? Revisa spam o solicita uno nuevo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
