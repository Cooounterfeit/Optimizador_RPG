import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthProvider } from './AuthProvider';
import { RegisterPage } from './RegisterPage';
import { fakeAuthService } from './test-auth';

const renderRegister = (service = fakeAuthService().service) =>
  render(
    <AuthProvider service={service}>
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/perfil" element={<p>perfil</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

const fill = (values: { name?: string; email?: string; password?: string; confirm?: string }) => {
  if (values.name !== undefined)
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: values.name } });
  if (values.email !== undefined)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: values.email } });
  if (values.password !== undefined)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: values.password } });
  if (values.confirm !== undefined)
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: values.confirm },
    });
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

describe('RegisterPage', () => {
  it('exige el nombre', async () => {
    renderRegister();
    submit();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Enter a display name.');
  });

  it('exige una contrasena de 8 caracteres', async () => {
    renderRegister();
    fill({ name: 'Ana', email: 'ana@ejemplo.cl', password: 'corta', confirm: 'corta' });
    submit();
    expect(await screen.findByText('Use at least 8 characters.')).toBeTruthy();
  });

  it('exige que las contrasenas coincidan', async () => {
    renderRegister();
    fill({
      name: 'Ana',
      email: 'ana@ejemplo.cl',
      password: 'secreta123',
      confirm: 'secreta124',
    });
    submit();
    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
  });

  it('avisa que hay que confirmar el correo', async () => {
    const { service } = fakeAuthService({
      service: {
        async signUp() {
          return { needsConfirmation: true };
        },
      },
    });
    renderRegister(service);

    fill({
      name: 'Ana',
      email: 'ana@ejemplo.cl',
      password: 'secreta123',
      confirm: 'secreta123',
    });
    submit();

    expect(await screen.findByText('Check your email')).toBeTruthy();
  });

  it('con sesion directa va al perfil', async () => {
    renderRegister();

    fill({
      name: 'Ana',
      email: 'ana@ejemplo.cl',
      password: 'secreta123',
      confirm: 'secreta123',
    });
    submit();

    await waitFor(() => expect(screen.getByText('perfil')).toBeTruthy());
  });
});
