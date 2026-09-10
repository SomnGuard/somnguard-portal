export const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]{3,60}$/;
export const firstNameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]{2,30}$/;
export const lastNameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]{2,30}$/;
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const phoneRegex = /^\+?[0-9]{7,15}$/;

export function isValidEmail(email: string): boolean {
  return emailRegex.test(String(email).trim().toLowerCase());
}

export function isValidName(name: string): boolean {
  return nameRegex.test(String(name).trim());
}

export function isValidFirstName(value: string): boolean {
  return firstNameRegex.test(String(value).trim());
}

export function isValidLastName(value: string): boolean {
  return lastNameRegex.test(String(value).trim());
}

export function isValidPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s\-()]/g, '');
  return phoneRegex.test(normalized);
}

export function isStrongPassword(password: string): boolean {
  const value = String(password);
  return (
    value.length >= 8 &&
    value.length <= 20 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value) &&
    !/\s/.test(value)
  );
}

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | '';

export function getPasswordStrength(password: string): { label: string; percent: number; color: string; level: PasswordStrength } {
  if (!password) return { label: '', percent: 0, color: 'transparent', level: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Débil', percent: 33, color: '#ff5555', level: 'weak' };
  if (score === 3) return { label: 'Media', percent: 60, color: '#ffb020', level: 'fair' };
  if (score === 4) return { label: 'Buena', percent: 80, color: '#00C8C8', level: 'good' };
  return { label: 'Fuerte', percent: 100, color: '#00e5a0', level: 'strong' };
}

export function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '').slice(0, 60);
}

export function sanitizeFirstName(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s\-']/g, '').slice(0, 30);
}

export function sanitizeLastName(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s\-']/g, '').slice(0, 30);
}

export function sanitizeEmail(value: string): string {
  return value.replace(/\s/g, '').toLowerCase().slice(0, 254);
}

export function sanitizePhone(value: string): string {
  // permite +, dígitos, espacios, guiones, paréntesis; luego se normaliza en validación
  return value.replace(/[^0-9+\s\-()]/g, '').slice(0, 20);
}

export function sanitizePasswordNoSpaces(value: string): string {
  return value.replace(/\s/g, '').slice(0, 72);
}

export const codeRegex = /^\d{6}$/;
export function isValidCode(code: string): boolean {
  return codeRegex.test(code);
}
export function sanitizeCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

export interface LoginErrors {
  email?: string;
  password?: string;
}
export interface RegisterErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirm?: string;
}
export interface ForgotErrors {
  email?: string;
}

export function validateLogin(email: string, password: string): { valid: boolean; errors: LoginErrors } {
  const errors: LoginErrors = {};
  const e = email.trim().toLowerCase();
  if (!e) errors.email = 'El correo es obligatorio.';
  else if (!isValidEmail(e)) errors.email = 'Ingresa un correo válido (ej: usuario@dominio.com).';

  if (!password) errors.password = 'La contraseña es obligatoria.';
  else if (/\s/.test(password)) errors.password = 'No se permiten espacios en la contraseña.';
  else if (password.length < 4) errors.password = 'Contraseña demasiado corta.';

  return { valid: Object.keys(errors).length === 0, errors };
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
}

export function validateRegister(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  password: string,
  confirm: string
): { valid: boolean; errors: RegisterErrors } {
  const errors: RegisterErrors = {};
  const fn = firstName.trim();
  const ln = lastName.trim();
  const e = email.trim().toLowerCase();
  const ph = phone.trim();

  if (!fn) errors.firstName = 'El nombre es obligatorio.';
  else if (fn.length < 2) errors.firstName = 'Mínimo 2 caracteres.';
  else if (!isValidFirstName(fn)) errors.firstName = 'Solo letras y espacios. Mínimo 2 caracteres.';

  if (!ln) errors.lastName = 'El apellido es obligatorio.';
  else if (ln.length < 2) errors.lastName = 'Mínimo 2 caracteres.';
  else if (!isValidLastName(ln)) errors.lastName = 'Solo letras y espacios. Mínimo 2 caracteres.';

  if (!e) errors.email = 'El correo es obligatorio.';
  else if (!isValidEmail(e)) errors.email = 'Ingresa un correo válido.';

  if (!ph) errors.phone = 'El teléfono es obligatorio.';
  else if (!isValidPhone(ph)) errors.phone = 'Teléfono inválido. Usa 7-15 dígitos, opcional + al inicio.';

  if (!password) errors.password = 'La contraseña es obligatoria.';
  else if (!isStrongPassword(password)) errors.password = 'Debe tener 8-20 caracteres, mayúscula, minúscula, número y símbolo, sin espacios.';

  if (!confirm) errors.confirm = 'Confirma la contraseña.';
  else if (password !== confirm) errors.confirm = 'Las contraseñas no coinciden.';

  return { valid: Object.keys(errors).length === 0, errors };
}

// Compatibilidad: validación antigua con un solo campo name (no usar para nuevo registro)
export function validateRegisterLegacy(name: string, email: string, password: string, confirm: string) {
  return validateRegister(name, '', email, '0000000', password, confirm);
}

export function validateForgot(email: string): { valid: boolean; errors: ForgotErrors } {
  const errors: ForgotErrors = {};
  const e = email.trim().toLowerCase();
  if (!e) errors.email = 'El correo es obligatorio.';
  else if (!isValidEmail(e)) errors.email = 'Ingresa un correo válido.';
  return { valid: Object.keys(errors).length === 0, errors };
}

export interface VerifyCodeErrors {
  code?: string;
}
export function validateVerifyCode(code: string): { valid: boolean; errors: VerifyCodeErrors } {
  const errors: VerifyCodeErrors = {};
  const c = code.trim();
  if (!c) errors.code = 'El código es obligatorio.';
  else if (!isValidCode(c)) errors.code = 'Ingresa un código de 6 dígitos (solo números).';
  return { valid: Object.keys(errors).length === 0, errors };
}

export interface ResetPasswordErrors {
  token?: string;
  newPassword?: string;
  confirm?: string;
}

export function isValidResetPassword(password: string): boolean {
  const v = String(password);
  return (
    v.length >= 8 &&
    v.length <= 72 &&
    /[a-z]/.test(v) &&
    /[A-Z]/.test(v) &&
    /\d/.test(v) &&
    /[^A-Za-z0-9]/.test(v) &&
    !/\s/.test(v)
  );
}

export function validateResetPassword(token: string, newPassword: string, confirm: string): { valid: boolean; errors: ResetPasswordErrors } {
  const errors: ResetPasswordErrors = {};
  if (!token.trim()) errors.token = 'El enlace de recuperación no es válido o ha expirado.';
  if (!newPassword) errors.newPassword = 'La nueva contraseña es obligatoria.';
  else if (!isValidResetPassword(newPassword)) errors.newPassword = 'Debe tener 8-72 caracteres, mayúscula, minúscula, número y símbolo, sin espacios.';
  if (!confirm) errors.confirm = 'Confirma la contraseña.';
  else if (newPassword !== confirm) errors.confirm = 'Las contraseñas no coinciden.';
  return { valid: Object.keys(errors).length === 0, errors };
}
