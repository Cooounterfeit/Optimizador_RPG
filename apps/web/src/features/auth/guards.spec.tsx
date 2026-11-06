import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { AuthService } from './auth-service';
import { AuthProvider } from './AuthProvider';
import { RequireSession, RedirectIfSignedIn, safeNext } from './guards';
import { fakeAuthService, SAMPLE_USER } from './test-auth';

function Location() {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

const renderAt = (
  entry: string,
  element: React.ReactNode,
  service: AuthService | null = fakeAuthService().service,
) =>
  render(
    <AuthProvider service={service}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/perfil" element={element} />
          <Route path="/login" element={<p>login</p>} />
          <Route path="/" element={<p>hub</p>} />
        </Routes>
        <Location />
      </MemoryRouter>
    </AuthProvider>,
  );

describe('RequireSession', () => {
  it('sin sesion redirige al login y recuerda el destino', async () => {
    renderAt(
      '/perfil',
      <RequireSession>
        <p>privado</p>
      </RequireSession>,
    );

    expect(await screen.findByText('login')).toBeTruthy();
    expect(screen.getByText('/login?next=%2Fperfil')).toBeTruthy();
  });

  it('con sesion muestra el contenido', async () => {
    renderAt(
      '/perfil',
      <RequireSession>
        <p>privado</p>
      </RequireSession>,
      fakeAuthService({ initialUser: SAMPLE_USER }).service,
    );

    expect(await screen.findByText('privado')).toBeTruthy();
  });

  it('sin configuracion explica como activarla', async () => {
    renderAt('/perfil', <RequireSession><p>privado</p></RequireSession>, null);

    expect(await screen.findByText('Accounts are not configured')).toBeTruthy();
  });
});

describe('RedirectIfSignedIn', () => {
  it('con sesion manda al hub', async () => {
    render(
      <AuthProvider service={fakeAuthService({ initialUser: SAMPLE_USER }).service}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route
              path="/login"
              element={
                <RedirectIfSignedIn>
                  <p>formulario</p>
                </RedirectIfSignedIn>
              }
            />
            <Route path="/" element={<p>hub</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('hub')).toBeTruthy();
    expect(screen.queryByText('formulario')).toBeNull();
  });
});

describe('safeNext', () => {
  it('solo acepta rutas internas', () => {
    expect(safeNext('/perfil')).toBe('/perfil');
    expect(safeNext('https://otro.sitio')).toBe('/');
    expect(safeNext('//otro.sitio')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
