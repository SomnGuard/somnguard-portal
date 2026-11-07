import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthModals } from './AuthModals';

function renderLogin(onLogin: (email: string, password: string) => Promise<void>) {
  return render(
    <AuthModals
      open="login"
      onClose={vi.fn()}
      onSwitch={vi.fn()}
      onLogin={onLogin}
      onRegister={vi.fn()}
      onForgot={vi.fn(async () => 'Código enviado')}
    />,
  );
}

describe('login modal', () => {
  it('validates required fields before starting login', async () => {
    const onLogin = vi.fn(async () => {});
    renderLogin(onLogin);

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('El correo es obligatorio.')).toBeTruthy();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeTruthy();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('submits credentials entered by the user and displays authentication failures', async () => {
    const onLogin = vi.fn(async () => {
      throw new Error('Credenciales inválidas');
    });
    const user = userEvent.setup();
    renderLogin(onLogin);

    await user.type(screen.getByLabelText('Correo electrónico'), 'user@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'StrongPass123!');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('user@example.com', 'StrongPass123!'));
    expect((await screen.findByRole('alert')).textContent).toContain('Credenciales inválidas');
  });
});
