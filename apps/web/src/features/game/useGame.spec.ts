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
import { useGame } from './useGame';

vi.mock('./builtin-games', () => ({
  findBuiltinGame: vi.fn(),
}));

const OPTIMIZER_ID = 'a8af21aa-cfef-4975-87f8-d1f43d411a70';

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'genshin',
  name: 'Genshin Impact',
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
  name: 'Genshin Impact optimizer',
  gameName: 'Genshin Impact',
  description: '',
  template,
  sampleItems: [],
  ...overrides,
});

const games = () => {
  const save = vi.fn(async (game: Parameters<GameRepository['save']>[0]) => ({
    ...game,
    updatedAt: 0,
  }));

  const repository: GameRepository = {
    list: async () => [],
    get: async () => undefined,
    save,
    remove: async () => undefined,
    clearLocalData: async () => undefined,
  };

  return { repository, save };
};

const builtin = () => ({
  id: 'genshin',
  card: {
    id: 'genshin',
    name: 'Genshin Impact optimizer',
    gameName: 'Genshin Impact',
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
    setOptimizerRepository({ getOptimizer });
    const gameRepo = games();
    setGameRepository(gameRepo.repository);

    const { result } = renderHook(() => useGame(OPTIMIZER_ID));

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(result.current.state.status === 'ready' && result.current.state.template).toEqual(template);
    expect(getOptimizer).toHaveBeenCalledWith(OPTIMIZER_ID);
    expect(gameRepo.save).toHaveBeenCalledWith({ id: 'genshin', template });
  });

  it('va directo al juego integrado cuando el id no es un uuid', async () => {
    const getOptimizer = vi.fn(async () => record());
    setOptimizerRepository({ getOptimizer });
    const gameRepo = games();
    setGameRepository(gameRepo.repository);
    vi.mocked(findBuiltinGame).mockReturnValue(builtin());

    const { result } = renderHook(() => useGame('genshin'));

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(getOptimizer).not.toHaveBeenCalled();
    expect(gameRepo.save).toHaveBeenCalledWith({ id: 'genshin', template });
  });

  it('da error cuando no existe ni en Supabase ni como juego integrado', async () => {
    setOptimizerRepository({ getOptimizer: async () => undefined });
    setGameRepository(games().repository);
    vi.mocked(findBuiltinGame).mockReturnValue(undefined);

    const { result } = renderHook(() => useGame(OPTIMIZER_ID));

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state.status === 'error' && result.current.state.message).toContain(
      'does not exist',
    );
  });
});
