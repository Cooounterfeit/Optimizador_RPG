import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProfileBaseRepository } from '@zenith/data-access';
import type { BaseProfile } from '@zenith/shared-types';

import { setProfileBaseRepository } from './repositories';
import { useProfileBase } from './useProfileBase';

const profile = {
  id: 'nova',
  name: 'Nova',
  base: { nivel: 1, atk: 10 },
} as BaseProfile;

const repo = (saved?: Record<string, number>): ProfileBaseRepository => ({
  get: vi.fn(async () => saved),
  save: vi.fn(async () => undefined),
  removeProfile: vi.fn(async () => undefined),
  removeByGame: vi.fn(async () => undefined),
});

/** Repositorio cuya lectura se resuelve a mano, para mirar el estado intermedio. */
const deferredRepo = () => {
  let resolve!: (saved: Record<string, number> | undefined) => void;
  const pending = new Promise<Record<string, number> | undefined>((done) => {
    resolve = done;
  });

  const fake: ProfileBaseRepository = {
    get: vi.fn(() => pending),
    save: vi.fn(async () => undefined),
    removeProfile: vi.fn(async () => undefined),
    removeByGame: vi.fn(async () => undefined),
  };

  return { fake, resolve };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useProfileBase', () => {
  it('usa la base guardada si existe', async () => {
    setProfileBaseRepository(repo({ nivel: 2, atk: 20 }));

    const { result } = renderHook(() => useProfileBase('g1', profile));

    await waitFor(() => expect(result.current.base).toEqual({ nivel: 2, atk: 20 }));
    expect(result.current.ready).toBe(true);
  });

  it('guarda una base nueva', async () => {
    const fake = repo();
    setProfileBaseRepository(fake);

    const { result } = renderHook(() => useProfileBase('g1', profile));
    await act(async () => {
      await result.current.save({ nivel: 3, atk: 30 });
    });

    expect(fake.save).toHaveBeenCalledWith('g1', 'nova', { nivel: 3, atk: 30 });
    expect(result.current.base).toEqual({ nivel: 3, atk: 30 });
  });

  it('no esta lista hasta que resuelve la base guardada', async () => {
    const { fake, resolve } = deferredRepo();
    setProfileBaseRepository(fake);

    const { result } = renderHook(() => useProfileBase('g1', profile));
    expect(result.current.ready).toBe(false);

    await act(async () => {
      resolve({ nivel: 4, atk: 40 });
    });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.base).toEqual({ nivel: 4, atk: 40 });
  });

  it('queda lista cuando no hay base guardada', async () => {
    setProfileBaseRepository(repo());

    const { result } = renderHook(() => useProfileBase('g1', profile));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.base).toEqual({ nivel: 1, atk: 10 });
  });

  it('queda lista cuando la lectura falla y cae a la base de la plantilla', async () => {
    setProfileBaseRepository({
      ...repo(),
      get: vi.fn(async () => {
        throw new Error('boom');
      }),
    });

    const { result } = renderHook(() => useProfileBase('g1', profile));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.base).toEqual({ nivel: 1, atk: 10 });
  });

  it('no esta lista sin perfil (plantilla sin perfiles)', () => {
    const { result } = renderHook(() => useProfileBase('g1', undefined));

    expect(result.current.ready).toBe(false);
    expect(result.current.base).toEqual({});
  });
});
