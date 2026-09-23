/**
 * Manejo centralizado de errores de API — traduce respuestas del backend
 * { error: { code, message, details: [{field, issue}], trace_id } }
 * a mensajes amigables para el usuario sin exponer información sensible.
 */

export interface ApiErrorDetail {
  field: string;
  issue: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];
  traceId?: string;
  raw: unknown;

  constructor(opts: { status: number; code: string; message: string; details?: ApiErrorDetail[]; traceId?: string; raw?: unknown }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? [];
    this.traceId = opts.traceId;
    this.raw = opts.raw;
  }
}

type RawErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; issue?: string; message?: string }>;
    trace_id?: string;
  };
  message?: string;
};

export function parseApiError(status: number, body: unknown): ApiError {
  const raw = body as RawErrorBody;
  const err = raw?.error;

  if (err?.code || err?.message) {
    const details: ApiErrorDetail[] = (err.details ?? []).map((d) => ({
      field: d.field ?? '',
      issue: d.issue ?? d.message ?? '',
    }));
    return new ApiError({
      status,
      code: err.code ?? httpCodeToCode(status),
      message: err.message ?? raw.message ?? httpMessage(status),
      details,
      traceId: err.trace_id,
      raw: body,
    });
  }

  // fallback: {message} o texto plano
  const msg = raw?.message ?? `Error ${status}`;
  return new ApiError({
    status,
    code: httpCodeToCode(status),
    message: msg,
    details: [],
    raw: body,
  });
}

function httpCodeToCode(status: number): string {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMIT_EXCEEDED';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'UNKNOWN_ERROR';
}

function httpMessage(status: number): string {
  if (status === 0) return 'No hay conexión con el servidor';
  if (status >= 500) return 'Error interno del servidor';
  return `Error ${status}`;
}

/**
 * Mensaje amigable para el usuario según código HTTP + code backend.
 * Nunca expone trace_id ni details crudos.
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Mensajes específicos por código de negocio
    switch (error.code) {
      case 'INVALID_CREDENTIALS': {
        const m = error.message.toLowerCase();
        if (m.includes('correo no verificado') || m.includes('email_not_verified') || m.includes('no verificado')) {
          return 'Tu correo aún no está verificado. Revisa tu Gmail y usa el código de verificación.';
        }
        if (m.includes('suspended')) return 'Tu cuenta está suspendida. Contacta soporte.';
        if (m.includes('locked')) return 'Cuenta bloqueada por intentos fallidos. Intenta en 15 minutos.';
        return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
      }
      case 'VALIDATION_ERROR':
        // Si hay un solo campo con issue claro, devolverlo; si no, genérico
        if (error.details.length === 1 && error.details[0].issue) {
          return error.details[0].issue;
        }
        return 'Revisa los datos ingresados. Algunos campos no son válidos.';
      case 'EMAIL_CONFLICT':
        return 'Este correo ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.';
      case 'PHONE_CONFLICT':
        return 'Este teléfono ya está registrado con otra cuenta.';
      case 'BAD_REQUEST': {
        const m = (error.message || '').toLowerCase();
        const detailsStr = error.details.map((d) => `${d.field} ${d.issue}`.toLowerCase()).join(' ');
        const combined = `${m} ${detailsStr}`;
        // No exponer detalles técnicos como IllegalArgumentException ni stack traces
        if (combined.includes('illegalargument') || combined.includes('exception') || combined.includes('stack') || combined.includes('java.lang')) {
          if (combined.includes('expir')) return 'El código ha expirado. Solicita un nuevo código.';
          if (combined.includes('utilizado') || combined.includes('usado') || combined.includes('consumido') || combined.includes('ya no es válido')) return 'Este código ya no es válido. Solicita un nuevo código.';
          if (combined.includes('código') || combined.includes('codigo') || combined.includes('token') || combined.includes('code')) return 'El código ingresado es incorrecto o ha expirado.';
          return 'Solicitud inválida. Revisa los datos e intenta de nuevo.';
        }
        if (combined.includes('código') || combined.includes('codigo') || combined.includes('token') || combined.includes('code')) {
          if (combined.includes('expir')) return 'El código ha expirado. Solicita un nuevo código.';
          if (combined.includes('utilizado') || combined.includes('usado') || combined.includes('consumido') || combined.includes('ya no es válido')) return 'Este código ya no es válido. Solicita un nuevo código.';
          if (combined.includes('incorrecto') || combined.includes('inválido') || combined.includes('invalido')) return 'El código ingresado es incorrecto.';
          return 'El código ingresado es incorrecto o ha expirado.';
        }
        return error.message || 'Solicitud inválida. Revisa los datos e intenta de nuevo.';
      }
      case 'FORBIDDEN':
        return 'No tienes permiso para realizar esta acción.';
      case 'NOT_FOUND':
        return 'Recurso no encontrado.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
      case 'INTERNAL_ERROR':
        return 'Error interno del servidor. Intenta más tarde.';
      default: {
        const lower = (error.message || '').toLowerCase();
        // Nunca exponer IllegalArgumentException, stack traces u otros detalles técnicos
        if (lower.includes('illegalargument') || lower.includes('exception') || lower.includes('stack') || lower.includes('java.lang')) {
          if (lower.includes('expir')) return 'El código ha expirado. Solicita un nuevo código.';
          if (lower.includes('código') || lower.includes('codigo') || lower.includes('token')) return 'El código ingresado es incorrecto o ha expirado.';
          return 'Ocurrió un error. Intenta de nuevo.';
        }
        // Si es 400 con mensaje de backend en español, úsalo tal cual (ej. "Contraseña actualizada")
        // pero limita longitud y evita exponer detalles técnicos
        if (error.status >= 400 && error.status < 500 && error.message && error.message.length < 120) {
          // capitaliza primer letra
          return error.message.charAt(0).toUpperCase() + error.message.slice(1);
        }
        if (error.status >= 500) return 'Error interno del servidor. Intenta más tarde.';
        if (error.message && error.message !== `Error ${error.status}`) return error.message;
        return 'Ocurrió un error. Intenta de nuevo.';
      }
    }
  }
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('No hay conexión')) {
      return 'No hay conexión con el servidor. Verifica tu internet.';
    }
    // No exponer stack
    return error.message.length < 150 ? error.message : 'Ocurrió un error inesperado.';
  }
  return 'Ocurrió un error inesperado.';
}

/**
 * Convierte details [{field, issue}] a mapa {field: issue} para pintar errores por campo.
 * Normaliza nombres de backend a nombres de formulario front.
 */
export function mapDetailsToFieldErrors(details: ApiErrorDetail[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const d of details) {
    if (!d.field) continue;
    // normaliza: email, password, firstName, lastName, phone, token, newPassword, new_password, refreshToken
    const key = normalizeField(d.field);
    if (!map[key]) map[key] = d.issue || 'Campo inválido';
  }
  return map;
}

function normalizeField(field: string): string {
  const f = field.trim();
  // backend usa camelCase: firstName, lastName, newPassword ; a veces snake: new_password
  if (f === 'new_password') return 'newPassword';
  if (f === 'refresh_token' || f === 'refreshToken') return 'refreshToken';
  // el backend puede usar 'code' o 'token' para el código de 6 dígitos
  if (f === 'code') return 'code';
  if (f === 'token') return 'token';
  return f;
}

/** Solo para dev: log con trace_id sin mostrar al usuario */
export function logApiError(context: string, error: ApiError): void {
  console.error(`[${context}] ${error.code} (${error.status}) ${error.message}`, {
    details: error.details,
    trace_id: error.traceId,
    raw: error.raw,
  });
}
