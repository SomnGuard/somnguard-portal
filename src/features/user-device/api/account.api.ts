import { httpRequest } from '../../../shared/api/client';
import { endpoints, HTTP } from '../../../shared/api/endpoints';

const urlBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export interface UserMe {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  status?: string | null;
  statusCategory?: string | null;
}

function toMe(o: Record<string, unknown>): UserMe {
  return {
    id: String(o['id'] ?? ''),
    email: String(o['email'] ?? ''),
    firstName: (o['firstName'] ?? o['first_name'] ?? null) as string | null,
    lastName: (o['lastName'] ?? o['last_name'] ?? null) as string | null,
    phone: (o['phone'] ?? null) as string | null,
    status: (o['status'] ?? null) as string | null,
    statusCategory: (o['statusCategory'] ?? o['status_category'] ?? null) as string | null,
  };
}

export async function getMeApi(): Promise<UserMe> {
  const raw = await httpRequest<Record<string, unknown>>(`${urlBase}/users/me`, HTTP.GET);
  return toMe(raw);
}

export async function updateMeApi(input: { firstName?: string; lastName?: string; phone?: string | null; email?: string }): Promise<UserMe> {
  const raw = await httpRequest<Record<string, unknown>>(`${urlBase}/users/me`, HTTP.PATCH, input);
  return toMe(raw);
}

export async function deleteMeApi(): Promise<void> {
  await httpRequest<void>(`${urlBase}/users/me`, HTTP.DELETE);
}

export async function verifyPasswordApi(password: string): Promise<void> {
  await httpRequest<void>(`${urlBase}/auth/verify-password`, HTTP.POST, { password });
}

// Re-export centralizado para no duplicar la base en cada feature.
export { endpoints };
