import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthProvider } from '../../auth/AuthProvider';
import { fakeAuthService, SAMPLE_USER } from '../../auth/test-auth';
import { TopBar } from './TopBar';

const renderBar = (service = fakeAuthService().service) =>
  render(
    <AuthProvider service={service}>
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    </AuthProvider>,
  );

describe('TopBar', () => {
  it('sin sesion muestra el acceso para entrar', async () => {
    renderBar();

    expect(await screen.findByText('Sign in')).toBeTruthy();
    expect(screen.queryByText('Sign out')).toBeNull();
  });

  it('con sesion muestra el nombre y la salida', async () => {
    renderBar(fakeAuthService({ initialUser: SAMPLE_USER }).service);

    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
    expect(screen.queryByText('Sign in')).toBeNull();
  });
});
