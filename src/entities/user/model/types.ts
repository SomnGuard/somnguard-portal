export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  roles: UserRole[];
  permissions: string[];
  token?: string;
  refreshToken?: string;
}
