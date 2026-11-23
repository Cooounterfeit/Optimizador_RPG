import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GameRepository } from '@zenith/data-access';
import type { GameTemplate } from '@zenith/shared-types';

import {
  defaultOptimizerRepository,
  setOptimizerRepository,
  type OptimizerRecord,
} from '../optimizer/optimizer-repository';
import { findBuiltinGame } from './builtin-games';
import { setGameRepository } from './repositories';
import { fakeGameRepository, fakeOptimizerRepository } from './testing';
import { useGame } from './useGame';

vi.mock('./builtin-games', () => ({
  findBuiltinGame: vi.fn(),
}));

const OPTIMIZER_ID = 'a8af21aa-cfef-4975-87f8-d1f43d411a70';

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'gacha-demo',
  name: 'Astral Forge',
  description: '',
  stats: [],
  slots: [{ id: 'weapon', name: 'Weapon' }],
  sets: [],
  derived: [],
  objectives: [{ id: 'score', name: 'Score', description: '', kind: 'linear', formula: 'atk' }],
  baseProfiles: [{ id: 'base', name: 'Base', base: { atk: 100 } }],
  constrainableStats: [],
};

const record = (overrides: Partial<OptimizerRecord> = {}): OptimizerRecord => ({
  id: OPTIMIZER_ID,
  name: 'Astral Forge optimizer',
  gameName: 'Astral Forge',
  description: '',
  template,
  sampleItems: [],
  published: true,
  ...overrides,
});

const games = () => {
  const save = vi.fn(async (game: Parameters<GameRepository['save']>[0]) => ({
    ...game,
    updatedAt: 0,
  }));

  const { repo: repository } = fakeGameRepository([], { save });

  return { repository, save };
};

const builtin = () => ({
  id: 'gacha-demo',
  card: {
    id: 'gacha-demo',
    name: 'Astral Forge optimizer',
    gameName: 'Astral Forge',
    description: '',
    author: { id: 'zenith', displayName: 'ZenithOptimizer' },
    score: 0,
    votesCount: 0,
    createdAt: '2026-11-06T00:00:00.000Z',
    published: true,
  },
  load: async () => ({
    zenith: '0.1' as const,
    exportedAt: '2026-11-06T00:00:00.000Z',
    template,
    items: [],
  }),
});

afterEach(() => {
  setOptimizerRepository(defaultOptimizerRepository);
  setGameRepository(games().repository);
  vi.mocked(findBuiltinGame).mockReset();
});

describe('useGame', () => {
  it('lee la plantilla de Supabase y la cachea por gameId', async () => {
    const getOptimizer = vi.fn(async () => record());
    setOptimizerRepository(fakeOptimizerRepository({ getOptimizer }));
    const gameRepo = games();
    setGameRepository(gameRepo.repository);

    const { result } = renderHook(() => useGame(OPTIMIZER_ID));

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.status === 'ready' && result.current.state.template).toEqual(template);
    expect(result.current.state.status === 'ready' && result.current.state.sampleItems).toEqual([]);
    expect(getOptimizer).toHaveBeenCalledWith(OPTIMIZER_ID);
    // `cloud: true` porque no vino del origen local: es una copia de algo
    // ajeno y la portada no debe listarla entre los borradores propios.
    expect(gameRepo.save).toHaveBeenCalledWith({ id: 'gacha-demo', template, cloud: true });
  });

  it('va directo al juego integrado cuando el id no es un uuid', async () => {
    const getOptimizer = vi.fn(async () => record());
    setOptimizerRepository(fakeOptimizerRepository({ getOptimizer }));
    const gameRepo = games();
    setGameRepository(gameRepo.repository);
    vi.mocked(findBuiltinGame).mockReturnValue(builtin());

    const { result } = renderHook(() => useGame('gacha-demo'));

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(getOptimizer).not.toHaveBeenCalled();
    // `cloud: true` porque no vino del origen local: es una copia de algo
    // ajeno y la portada no debe listarla entre los borradores propios.
    expect(gameRepo.save).toHaveBeenCalledWith({ id: 'gacha-demo', template, cloud: true });
  });

  it('da error cuando no existe ni en Supabase ni como juego integrado', async () => {
    setOptimizerRepository(fakeOptimizerRepository({ getOptimizer: async () => undefined }));
    setGameRepository(games().repository);
    vi.mocked(findBuiltinGame).mockReturnValue(undefined);

    const { result } = renderHook(() => useGame(OPTIMIZER_ID));

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state.status === 'error' && result.current.state.message).toContain(
      'does not exist',
    );
  });
});
