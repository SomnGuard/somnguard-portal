/**
 * Facade de compatibilidad - re-exporta desde la nueva arquitectura
 */

export type { User, RegisterPayload, VerifyEmailPayload, AuthResponse } from '../features/auth/api/auth.api';
export { loginApi, registerApi, verifyEmailApi, forgotPasswordApi, verifyResetCodeApi, resetPasswordApi, refreshApi, logoutApi } from '../features/auth/api/auth.api';
