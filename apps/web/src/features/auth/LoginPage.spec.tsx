import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthError, type AuthService } from './auth-service';
import { AuthProvider } from './AuthProvider';
import { LoginPage } from './LoginPage';
import { fakeAuthService } from './test-auth';

const renderLogin = (
  service: AuthService | null = fakeAuthService().service,
  entry = '/login',
) =>
  render(
    <AuthProvider service={service}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/perfil" element={<p>perfil</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};

describe('LoginPage', () => {
  it('sin configuracion explica el problema en vez de mostrar el formulario', () => {
    renderLogin(null);
    expect(screen.getByText('Accounts are not configured')).toBeTruthy();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('pide el correo antes de enviar', async () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Enter your email.',
    );
  });

  it('muestra el error de credenciales', async () => {
    const { service } = fakeAuthService({
      service: {
        async signIn() {
          throw new AuthError('invalid-credentials');
        },
      },
    });
    renderLogin(service);

    fill('ana@ejemplo.cl', 'mala');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Wrong email or password.')).toBeTruthy();
  });

  it('al entrar vuelve al destino de next', async () => {
    renderLogin(fakeAuthService().service, '/login?next=%2Fperfil');

    fill('ana@ejemplo.cl', 'secreta123');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByText('perfil')).toBeTruthy());
  });
});
