/** Compatibility facade for older imports. New code should import feature APIs directly. */
export type { User, UserRole, RegisterPayload, VerifyEmailPayload, AuthResponse } from '../features/auth/api/auth.api';
export { loginApi, registerApi, verifyEmailApi, forgotPasswordApi, verifyResetCodeApi, resetPasswordApi, refreshApi, logoutApi } from '../features/auth/api/auth.api';
