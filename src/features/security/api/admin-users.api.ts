import { endpoints, HTTP } from '../../../shared/api/endpoints';
import { httpRequest } from '../../../shared/api/client';

export interface AdminUserRole { id: string; code: string; name: string }
export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isActive: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  status?: string;
  statusCategory?: string;
  createdAt?: string;
  updatedAt?: string;
  roles: AdminUserRole[];
}
export interface CreateAdminUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}
export interface UpdateAdminUser {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

type AdminUserWire = Partial<AdminUser> & Record<string, unknown>;

function normalizeAdminUser(data: AdminUserWire): AdminUser {
  const roles = (data.roles ?? []) as Array<AdminUserRole & Record<string, unknown>>;
  return {
    id: String(data.id ?? ''),
    email: String(data.email ?? ''),
    firstName: String(data.firstName ?? data.first_name ?? ''),
    lastName: String(data.lastName ?? data.last_name ?? ''),
    phone: (data.phone ?? null) as string | null,
    isActive: Boolean(data.isActive ?? data.is_active),
    emailVerifiedAt: (data.emailVerifiedAt ?? data.email_verified_at ?? null) as string | null,
    lastLoginAt: (data.lastLoginAt ?? data.last_login_at ?? null) as string | null,
    status: String(data.status ?? ''),
    statusCategory: String(data.statusCategory ?? data.status_category ?? ''),
    createdAt: (data.createdAt ?? data.created_at) as string | undefined,
    updatedAt: (data.updatedAt ?? data.updated_at) as string | undefined,
    roles: roles.map((role) => ({ id: String(role.id ?? ''), code: String(role.code ?? ''), name: String(role.name ?? '') })),
  };
}

export const listUsersAdminApi = async () => {
  const data = await httpRequest<AdminUserWire[]>(endpoints.admin.users, HTTP.GET);
  return Array.isArray(data) ? data.map(normalizeAdminUser) : [];
};
export const getUserAdminApi = async (id: string) => normalizeAdminUser(await httpRequest<AdminUserWire>(endpoints.admin.user(id), HTTP.GET));
export const createUserAdminApi = async (body: CreateAdminUser) => normalizeAdminUser(await httpRequest<AdminUserWire>(endpoints.admin.users, HTTP.POST, body));
export const updateUserAdminApi = async (id: string, body: UpdateAdminUser) => normalizeAdminUser(await httpRequest<AdminUserWire>(endpoints.admin.user(id), HTTP.PUT, body));
export const deleteUserAdminApi = (id: string) => httpRequest<void>(endpoints.admin.user(id), HTTP.DELETE);
