import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AuthProvider } from './AuthProvider';
import { ProfilePage } from './ProfilePage';
import { copy } from '../catalog/copy';
import { fakeAuthService, SAMPLE_USER } from './test-auth';

const renderProfile = (service = fakeAuthService({ initialUser: SAMPLE_USER }).service) =>
  render(
    <AuthProvider service={service}>
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/" element={<p>hub</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

describe('ProfilePage', () => {
  it('muestra el correo en solo lectura', async () => {
    renderProfile();

    const email = (await screen.findByLabelText(copy.profile.email)) as HTMLInputElement;
    expect(email.value).toBe(SAMPLE_USER.email);
    expect(email.readOnly).toBe(true);
  });

  it('guarda el nombre sin espacios de sobra', async () => {
    const updateProfile = vi.fn(async () => SAMPLE_USER);
    const { service } = fakeAuthService({ initialUser: SAMPLE_USER, service: { updateProfile } });
    renderProfile(service);

    fireEvent.change(await screen.findByLabelText(copy.profile.displayName), {
      target: { value: '  Ana R  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.profile.save }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ displayName: 'Ana R', bio: '' }),
    );
    expect(await screen.findByText(copy.profile.saved)).toBeTruthy();
  });

  it('guarda la descripcion del perfil', async () => {
    const updateProfile = vi.fn(async () => SAMPLE_USER);
    const { service } = fakeAuthService({ initialUser: SAMPLE_USER, service: { updateProfile } });
    renderProfile(service);

    fireEvent.change(await screen.findByLabelText(copy.profile.bio), {
      target: { value: 'Main Ashe desde 2021' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.profile.save }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: SAMPLE_USER.displayName,
        bio: 'Main Ashe desde 2021',
      }),
    );
  });

  it('rechaza avatares que no son imagen', async () => {
    const uploadAvatar = vi.fn(async () => 'https://cdn.ejemplo.cl/a.webp');
    const { service } = fakeAuthService({ initialUser: SAMPLE_USER, service: { uploadAvatar } });
    renderProfile(service);

    const input = (await screen.findByLabelText(copy.profile.avatar)) as HTMLInputElement;
    const file = new File(['texto'], 'notas.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(copy.auth.errors['avatar-type'])).toBeTruthy();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('cerrar sesion vuelve al hub', async () => {
    renderProfile();

    fireEvent.click(await screen.findByRole('button', { name: copy.profile.signOut }));

    await waitFor(() => expect(screen.getByText('hub')).toBeTruthy());
  });
});
