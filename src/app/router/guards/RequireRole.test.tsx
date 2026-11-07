import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireRole } from './RequireRole';
import { useAuth } from '../../../features/auth/model/AuthContext';
import type { User } from '../../../entities/user/model/types';

vi.mock('../../../features/auth/model/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<p>Public home</p>} />
        <Route path="/403" element={<p>Forbidden page</p>} />
        <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
          <Route path="/protected" element={<p>Admin content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function createAuthState(user: User | null, isInitializing = false): ReturnType<typeof useAuth> {
  return {
    user,
    isAuthenticated: !!user,
    isInitializing,
    login: vi.fn(async () => user ?? { id: 'user-1', email: 'user@example.com', name: 'User', roles: [], permissions: [] }),
    register: vi.fn(async () => {}),
    verifyEmail: vi.fn(async () => ''),
    forgot: vi.fn(async () => ''),
    verifyResetCode: vi.fn(async () => ''),
    resetPassword: vi.fn(async () => ''),
    refresh: vi.fn(async () => {}),
    logout: vi.fn(async () => {}),
  };
}

describe('RequireRole', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset();
  });

  it('keeps the route pending while the session is initializing', () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState(null, true));

    renderProtectedRoute();

    expect(screen.getByText('Cargando sesión...')).toBeTruthy();
    expect(screen.queryByText('Admin content')).toBeNull();
  });

  it('redirects anonymous users to the public home', () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState(null));

    renderProtectedRoute();

    expect(screen.getByText('Public home')).toBeTruthy();
  });

  it('redirects users without an allowed role to the forbidden page', () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState({
      id: 'user-1', email: 'user@example.com', name: 'User', roles: ['USER'], permissions: [],
    }));

    renderProtectedRoute();

    expect(screen.getByText('Forbidden page')).toBeTruthy();
  });

  it('renders the protected route for an allowed role', () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState({
      id: 'admin-1', email: 'admin@example.com', name: 'Admin', roles: ['ADMIN'], permissions: [],
    }));

    renderProtectedRoute();

    expect(screen.getByText('Admin content')).toBeTruthy();
  });
});
