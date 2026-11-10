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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useProfileBase', () => {
  it('usa la base guardada si existe', async () => {
    setProfileBaseRepository(repo({ nivel: 2, atk: 20 }));

    const { result } = renderHook(() => useProfileBase('g1', profile));

    await waitFor(() => expect(result.current.base).toEqual({ nivel: 2, atk: 20 }));
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
});
