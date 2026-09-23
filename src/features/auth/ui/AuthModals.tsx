import { useEffect, useMemo, useState } from 'react';
import { SomnguardLogoStatic } from '../../../shared/ui/SomnguardLogo';
import {
  getPasswordStrength,
  sanitizeEmail,
  sanitizeFirstName,
  sanitizeLastName,
  sanitizePasswordNoSpaces,
  sanitizePhone,
  validateForgot,
  validateLogin,
  validateRegister,
} from '../../../shared/lib/validation';
import { useToast } from '../../../shared/ui/Toast';
import { ApiError, getUserMessage, mapDetailsToFieldErrors } from '../../../shared/api/errors';
import type { RegisterPayload } from '../api/auth.api';

type ModalType = 'login' | 'register' | 'forgot' | null;

type Props = {
  open: ModalType;
  onClose: () => void;
  onSwitch: (to: Exclude<ModalType, null>) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (payload: RegisterPayload) => Promise<void>;
  onForgot: (email: string) => Promise<string>;
};

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 10.6A3 3 0 0012 15a3 3 0 002.4-1.2" /><path d="M9.9 5.1A10.7 10.7 0 0112 4c5.5 0 9.4 4.5 10 8-.3 1.8-1.5 3.9-3.2 5.6" /><path d="M14.8 14.8A3 3 0 019.2 9.2" /><path d="M3.8 9.3C2.2 10.9 1 12 1 12c.6 3.5 4.5 8 11 8 1.7 0 3.2-.4 4.6-1" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3.5" /></svg>
  );
}

export function AuthModals({ open, onClose, onSwitch, onLogin, onRegister, onForgot }: Props) {
  return (
    <>
      <LoginModal open={open === 'login'} onClose={onClose} onSwitch={onSwitch} onLogin={onLogin} />
      <RegisterModal open={open === 'register'} onClose={onClose} onSwitch={onSwitch} onRegister={onRegister} />
      <ForgotModal open={open === 'forgot'} onClose={onClose} onSwitch={onSwitch} onForgot={onForgot} />
    </>
  );
}

function ModalShell({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`modal ${open ? 'active' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar modal">×</button>
        <div className="modal-logo"><SomnguardLogoStatic size={80} /></div>
        {children}
      </div>
    </div>
  );
}

function LoginModal({ open, onClose, onSwitch, onLogin }: { open: boolean; onClose: () => void; onSwitch: Props['onSwitch']; onLogin: Props['onLogin'] }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const toast = useToast();

  useEffect(() => { if (open) { setApiError(''); } }, [open]);

  const liveValidate = (ne: string, np: string) => {
    const { errors: e } = validateLogin(ne, np);
    const filtered: typeof e = {};
    if (touched.email) filtered.email = e.email;
    if (touched.password) filtered.password = e.password;
    setErrors(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setTouched({ email: true, password: true });
    const { valid, errors: v } = validateLogin(email, password);
    if (!valid) { setErrors(v); return; }
    setSubmitting(true);
    try {
      await onLogin(sanitizeEmail(email), password);
      toast({ title: '¡Bienvenido!', msg: 'Sesión iniciada correctamente.', type: 'success' });
      onClose();
      setEmail(''); setPassword(''); setErrors({}); setTouched({});
    } catch (err: unknown) {
      if (err instanceof ApiError && err.details.length > 0) {
        const fieldErrors = mapDetailsToFieldErrors(err.details);
        const mapped: typeof errors = {};
        if (fieldErrors.email) mapped.email = fieldErrors.email;
        if (fieldErrors.password) mapped.password = fieldErrors.password;
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

  const emailValid = open && touched.email && !errors.email && email.length > 0;
  const passValid = open && touched.password && !errors.password && password.length > 0;

  return (
    <ModalShell open={open} onClose={onClose} label="Iniciar sesión">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="loginEmail">Correo electrónico</label>
          <input
            id="loginEmail"
            type="email"
            className={`form-input ${errors.email ? 'input-invalid' : emailValid ? 'input-valid' : ''}`}
            value={email}
            onChange={(e) => {
              const v = sanitizeEmail(e.target.value);
              setEmail(v);
              if (touched.email) liveValidate(v, password);
            }}
            onBlur={() => { setTouched((p) => ({ ...p, email: true })); liveValidate(email, password); }}
            placeholder="usuario@somnguard.com"
            required
            autoComplete="email"
            autoFocus={open}
          />
          <div className="field-error" id="loginEmailError" aria-live="polite">{errors.email || ''}</div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="loginPassword">Contraseña</label>
          <div className="password-wrap">
            <input
              id="loginPassword"
              type={showPass ? 'text' : 'password'}
              className={`form-input ${errors.password ? 'input-invalid' : passValid ? 'input-valid' : ''}`}
              value={password}
              onChange={(e) => {
                const v = sanitizePasswordNoSpaces(e.target.value);
                setPassword(v);
                if (touched.password) liveValidate(email, v);
              }}
              onBlur={() => { setTouched((p) => ({ ...p, password: true })); liveValidate(email, password); }}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button type="button" className="password-toggle" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <EyeIcon off={showPass} />
            </button>
          </div>
          <div className="field-error" id="loginPasswordError">{errors.password || ''}</div>
        </div>

        {apiError && <div className="form-error" style={{ display: 'block' }} role="alert">{apiError}</div>}
        <button type="submit" className="btn-submit" id="loginBtn" disabled={submitting}>
          {submitting && <span className="spinner" aria-hidden />}
          {submitting ? 'Validando...' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="modal-links">
        <p>
          <span className="modal-link">¿No tienes cuenta? </span>
          <button className="modal-link accent" onClick={() => onSwitch('register')}>Regístrate</button>
        </p>
        <p style={{ marginTop: 10 }}>
          <button className="modal-link accent" onClick={() => onSwitch('forgot')}>¿Olvidaste tu contraseña?</button>
        </p>
      </div>
    </ModalShell>
  );
}

function RegisterModal({ open, onClose, onSwitch, onRegister }: { open: boolean; onClose: () => void; onSwitch: Props['onSwitch']; onRegister: Props['onRegister'] }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; phone?: string; password?: string; confirm?: string }>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const toast = useToast();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => { if (open) setApiError(''); }, [open]);

  const liveValidate = (
    fn: string, ln: string, e: string, ph: string, p: string, c: string,
    t = touched
  ) => {
    const { errors: v } = validateRegister(fn, ln, e, ph, p, c);
    const filtered: typeof v = {};
    if (t.firstName) filtered.firstName = v.firstName;
    if (t.lastName) filtered.lastName = v.lastName;
    if (t.email) filtered.email = v.email;
    if (t.phone) filtered.phone = v.phone;
    if (t.password) filtered.password = v.password;
    if (t.confirm) filtered.confirm = v.confirm;
    setErrors(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    const nt = { firstName: true, lastName: true, email: true, phone: true, password: true, confirm: true };
    setTouched(nt);
    const result = validateRegister(firstName, lastName, email, phone, password, confirm);
    if (!result.valid) { setErrors(result.errors); return; }
    setSubmitting(true);
    try {
      const payload: RegisterPayload = {
        firstName: sanitizeFirstName(firstName).trim(),
        lastName: sanitizeLastName(lastName).trim(),
        email: sanitizeEmail(email),
        phone: sanitizePhone(phone).trim(),
        password,
      };
      await onRegister(payload);
      console.log('[RegisterModal] register ok', { email: sanitizeEmail(email) });
      toast({ title: 'Cuenta creada', msg: 'Cuenta creada. Ahora verifica tu correo para continuar.', type: 'success' });
      onClose();
      setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setPassword(''); setConfirm(''); setErrors({}); setTouched({});
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const fieldErrors = mapDetailsToFieldErrors(err.details);
        const mapped: typeof errors = {};
        if (fieldErrors.firstName) mapped.firstName = fieldErrors.firstName;
        if (fieldErrors.lastName) mapped.lastName = fieldErrors.lastName;
        if (fieldErrors.email) mapped.email = fieldErrors.email;
        if (fieldErrors.phone) mapped.phone = fieldErrors.phone;
        if (fieldErrors.password) mapped.password = fieldErrors.password;
        // conflictos específicos
        if (err.code === 'EMAIL_CONFLICT') mapped.email = getUserMessage(err);
        if (err.code === 'PHONE_CONFLICT') mapped.phone = getUserMessage(err);
        if (Object.keys(mapped).length > 0) {
          setErrors((prev) => ({ ...prev, ...mapped }));
          // si es solo error de campo, no duplicar en apiError; si hay mensaje general, mostrarlo
          if (err.code === 'VALIDATION_ERROR' && err.details.length > 0) setApiError('');
          else if (mapped.email || mapped.phone) setApiError('');
          else setApiError(getUserMessage(err));
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
    <ModalShell open={open} onClose={onClose} label="Registrarse">
      <form onSubmit={handleSubmit} noValidate>
        <div className="register-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="registerFirstName">Nombre</label>
            <input
              id="registerFirstName"
              type="text"
              className={`form-input ${errors.firstName ? 'input-invalid' : (touched.firstName && firstName && !errors.firstName ? 'input-valid' : '')}`}
              value={firstName}
              onChange={(e) => {
                const v = sanitizeFirstName(e.target.value);
                setFirstName(v);
                if (touched.firstName) liveValidate(v, lastName, email, phone, password, confirm);
              }}
              onBlur={() => { const nt = { ...touched, firstName: true }; setTouched(nt); liveValidate(firstName, lastName, email, phone, password, confirm, nt); }}
              placeholder="Ej: Susana"
              required
              autoComplete="given-name"
            />
            <div className="field-error" id="registerFirstNameError">{errors.firstName || ''}</div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="registerLastName">Apellido</label>
            <input
              id="registerLastName"
              type="text"
              className={`form-input ${errors.lastName ? 'input-invalid' : (touched.lastName && lastName && !errors.lastName ? 'input-valid' : '')}`}
              value={lastName}
              onChange={(e) => {
                const v = sanitizeLastName(e.target.value);
                setLastName(v);
                if (touched.lastName) liveValidate(firstName, v, email, phone, password, confirm);
              }}
              onBlur={() => { const nt = { ...touched, lastName: true }; setTouched(nt); liveValidate(firstName, lastName, email, phone, password, confirm, nt); }}
              placeholder="Ej: Oria"
              required
              autoComplete="family-name"
            />
            <div className="field-error" id="registerLastNameError">{errors.lastName || ''}</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="registerEmail">Correo electrónico</label>
          <input
            id="registerEmail"
            type="email"
            className={`form-input ${errors.email ? 'input-invalid' : (touched.email && email && !errors.email ? 'input-valid' : '')}`}
            value={email}
            onChange={(e) => { const v = sanitizeEmail(e.target.value); setEmail(v); if (touched.email) liveValidate(firstName, lastName, v, phone, password, confirm); }}
            onBlur={() => { const nt = { ...touched, email: true }; setTouched(nt); liveValidate(firstName, lastName, email, phone, password, confirm, nt); }}
            placeholder="usuario@somnguard.com"
            required
            autoComplete="email"
          />
          <div className="field-error" id="registerEmailError">{errors.email || ''}</div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="registerPhone">Teléfono</label>
          <input
            id="registerPhone"
            type="tel"
            className={`form-input ${errors.phone ? 'input-invalid' : (touched.phone && phone && !errors.phone ? 'input-valid' : '')}`}
            value={phone}
            onChange={(e) => { const v = sanitizePhone(e.target.value); setPhone(v); if (touched.phone) liveValidate(firstName, lastName, email, v, password, confirm); }}
            onBlur={() => { const nt = { ...touched, phone: true }; setTouched(nt); liveValidate(firstName, lastName, email, phone, password, confirm, nt); }}
            placeholder="Ej: +57 3001234567"
            required
            autoComplete="tel"
          />
          <div className="field-error" id="registerPhoneError">{errors.phone || ''}</div>
          {!errors.phone && <div className="field-hint">7-15 dígitos, opcional + al inicio.</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="registerPassword">Contraseña</label>
          <div className="password-wrap">
            <input
              id="registerPassword"
              type={showPass ? 'text' : 'password'}
              className={`form-input ${errors.password ? 'input-invalid' : (touched.password && password && !errors.password ? 'input-valid' : '')}`}
              value={password}
              onChange={(e) => { const v = sanitizePasswordNoSpaces(e.target.value); setPassword(v); if (touched.password || touched.confirm) liveValidate(firstName, lastName, email, phone, v, confirm); }}
              onBlur={() => { const nt = { ...touched, password: true }; setTouched(nt); liveValidate(firstName, lastName, email, phone, password, confirm, nt); }}
              placeholder="Mín. 8 caracteres, mayúscula, número y símbolo"
              required
              autoComplete="new-password"
            />
            <button type="button" className="password-toggle" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Ocultar' : 'Mostrar'}>
              <EyeIcon off={showPass} />
            </button>
          </div>
          <div className="field-error" id="registerPasswordError">{errors.password || ''}</div>
          {password.length > 0 && (
            <div className="strength" aria-hidden>
              <div className="strength-bar"><div className="strength-fill" style={{ width: `${strength.percent}%`, background: strength.color }} /></div>
              <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
            </div>
          )}
          {!errors.password && <div className="field-hint">8-20 caracteres, mayúscula, minúscula, número y símbolo, sin espacios.</div>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="registerPasswordConfirm">Confirmar contraseña</label>
          <div className="password-wrap">
            <input
              id="registerPasswordConfirm"
              type={showConfirm ? 'text' : 'password'}
              className={`form-input ${errors.confirm ? 'input-invalid' : (touched.confirm && confirm && !errors.confirm ? 'input-valid' : '')}`}
              value={confirm}
              onChange={(e) => { const v = sanitizePasswordNoSpaces(e.target.value); setConfirm(v); if (touched.confirm || touched.password) liveValidate(firstName, lastName, email, phone, password, v); }}
              onBlur={() => { const nt = { ...touched, confirm: true }; setTouched(nt); liveValidate(firstName, lastName, email, phone, password, confirm, nt); }}
              required
              autoComplete="new-password"
            />
            <button type="button" className="password-toggle" onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}>
              <EyeIcon off={showConfirm} />
            </button>
          </div>
          <div className="field-error" id="registerPasswordConfirmError">{errors.confirm || ''}</div>
        </div>

        {apiError && <div className="form-error" style={{ display: 'block' }} role="alert">{apiError}</div>}
        <button type="submit" className="btn-submit" id="registerBtn" disabled={submitting}>
          {submitting && <span className="spinner" aria-hidden />}
          {submitting ? 'Creando cuenta...' : 'Registrarse'}
        </button>
      </form>

      <div className="modal-links">
        <p>
          <span className="modal-link">¿Ya tienes cuenta? </span>
          <button className="modal-link accent" onClick={() => onSwitch('login')}>Inicia sesión</button>
        </p>
      </div>
    </ModalShell>
  );
}

function ForgotModal({ open, onClose, onSwitch, onForgot }: { open: boolean; onClose: () => void; onSwitch: Props['onSwitch']; onForgot: Props['onForgot'] }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const toast = useToast();

  useEffect(() => { if (open) { setApiError(''); setSuccess(''); } }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(''); setSuccess('');
    setTouched(true);
    const { valid, errors: v } = validateForgot(email);
    if (!valid) { setErrors(v); return; }
    setSubmitting(true);
    try {
      await onForgot(sanitizeEmail(email));
      const codeMsg = 'Si el correo existe, se envió un código de 6 dígitos con expiración 15 minutos';
      setSuccess(codeMsg);
      toast({ title: 'Código enviado', msg: 'Recibirás un código de 6 dígitos en tu correo.', type: 'success' });
      // Cierre rápido: el flujo de recuperación (verify-code) lo maneja App.tsx tras el éxito del endpoint
      setTimeout(() => {
        setEmail(''); setSuccess(''); setTouched(false);
        onClose();
      }, 400);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.details.length > 0) {
        const fieldErrors = mapDetailsToFieldErrors(err.details);
        if (fieldErrors.email) {
          setErrors({ email: fieldErrors.email });
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
    <ModalShell open={open} onClose={onClose} label="Recuperar contraseña">
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="forgotEmail">Correo electrónico</label>
          <input
            id="forgotEmail"
            type="email"
            className={`form-input ${errors.email ? 'input-invalid' : (touched && email && !errors.email ? 'input-valid' : '')}`}
            value={email}
            onChange={(e) => {
              const v = sanitizeEmail(e.target.value);
              setEmail(v);
              if (touched) {
                const { errors: v2 } = validateForgot(v);
                setErrors(v2);
              }
            }}
            onBlur={() => {
              setTouched(true);
              const { errors: v2 } = validateForgot(email);
              setErrors(v2);
            }}
            placeholder="usuario@somnguard.com"
            required
            autoComplete="email"
          />
          <div className="field-error" id="forgotEmailError">{errors.email || ''}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>Te enviaremos un código de 6 dígitos para restablecer tu contraseña</p>
        </div>

        {apiError && <div className="form-error" style={{ display: 'block' }} role="alert">{apiError}</div>}
        {success && <div className="form-success" role="status">{success}</div>}
        <button type="submit" className="btn-submit" id="forgotBtn" disabled={submitting}>
          {submitting && <span className="spinner" aria-hidden />}
          {submitting ? 'Enviando...' : 'Enviar código'}
        </button>
      </form>

      <div className="modal-links">
        <p>
          <button className="modal-link accent" onClick={() => onSwitch('login')}>Volver al inicio de sesión</button>
        </p>
      </div>
    </ModalShell>
  );
}


