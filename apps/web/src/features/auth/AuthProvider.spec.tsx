import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthProvider, useAuth } from './AuthProvider';
import { fakeAuthService, SAMPLE_USER } from './test-auth';

function Status() {
  const { status, user } = useAuth();
  return <p>{`${status}:${user?.displayName ?? '-'}`}</p>;
}

const renderWith = (service: ReturnType<typeof fakeAuthService>['service'] | null) =>
  render(
    <AuthProvider service={service}>
      <MemoryRouter>
        <Status />
      </MemoryRouter>
    </AuthProvider>,
  );

describe('AuthProvider', () => {
  it('sin servicio queda en unconfigured', () => {
    renderWith(null);
    expect(screen.getByText('unconfigured:-')).toBeTruthy();
  });

  it('sin sesion queda en anonymous', async () => {
    renderWith(fakeAuthService().service);
    expect(await screen.findByText('anonymous:-')).toBeTruthy();
  });

  it('con sesion carga el usuario', async () => {
    renderWith(fakeAuthService({ initialUser: SAMPLE_USER }).service);
    expect(await screen.findByText('authenticated:Ana')).toBeTruthy();
  });
});

describe('login y logout desde el contexto', () => {
  function Actions() {
    const { status, signIn, signOut } = useAuth();
    return (
      <>
        <p>{status}</p>
        <button onClick={() => void signIn('ana@ejemplo.cl', 'secreta123')}>entrar</button>
        <button onClick={() => void signOut()}>salir</button>
      </>
    );
  }

  it('pasa de anonymous a authenticated y vuelve', async () => {
    const { service } = fakeAuthService();
    render(
      <AuthProvider service={service}>
        <MemoryRouter>
          <Actions />
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('anonymous')).toBeTruthy());

    screen.getByText('entrar').click();
    await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());

    screen.getByText('salir').click();
    await waitFor(() => expect(screen.getByText('anonymous')).toBeTruthy());
  });
});
