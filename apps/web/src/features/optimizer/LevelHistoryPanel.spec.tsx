import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LevelHistoryRepository, LevelSnapshot } from '@zenith/data-access';
import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { setLevelHistoryRepository } from '../game/repositories';
import { LevelHistoryPanel } from './LevelHistoryPanel';

const template = {
  gameId: 'g1',
  stats: [{ id: 'atk', name: 'ATK', unit: 'flat' }],
  leveling: {
    levelKey: 'nivel',
    min: 1,
    max: 10,
    growth: { atk: '10' },
  },
} as unknown as GameTemplate;

const profile = {
  id: 'nova',
  name: 'Nova',
  base: { nivel: 1, atk: 10 },
} as unknown as BaseProfile;

const makeRepo = (initial: LevelSnapshot[] = []) => {
  let rows = initial;
  const repo: LevelHistoryRepository = {
    list: vi.fn(async () => rows),
    recordLevel: vi.fn(async (_gameId, _profileId, level, base) => {
      rows = [...rows.filter((row) => row.level !== level), { level, base, at: 'now' }].sort(
        (a, b) => a.level - b.level,
      );
      return rows;
    }),
    removeLevel: vi.fn(async () => rows),
    clear: vi.fn(async () => undefined),
  };
  setLevelHistoryRepository(repo);
  return repo;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LevelHistoryPanel', () => {
  it('registra el nivel actual y avisa cuando no hay historial previo', async () => {
    const repo = makeRepo();
    render(<LevelHistoryPanel template={template} profile={profile} onLevelUp={vi.fn()} />);

    expect(await screen.findByText(/No history yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Record current level' }));

    await waitFor(() =>
      expect(repo.recordLevel).toHaveBeenCalledWith('g1', 'nova', 1, profile.base),
    );
    expect(await screen.findByText('Current level recorded.')).toBeTruthy();
  });

  it('sube de nivel y guarda el snapshot actual y el futuro', async () => {
    const repo = makeRepo();
    const onLevelUp = vi.fn(async () => undefined);
    render(<LevelHistoryPanel template={template} profile={profile} onLevelUp={onLevelUp} />);

    fireEvent.change(screen.getByLabelText('Future level to compare'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Level up to 2' }));

    await waitFor(() => expect(onLevelUp).toHaveBeenCalled());
    expect(repo.recordLevel).toHaveBeenCalledWith('g1', 'nova', 1, profile.base);
    expect(repo.recordLevel).toHaveBeenCalledWith(
      'g1',
      'nova',
      2,
      expect.objectContaining({ nivel: 2, atk: 20 }),
    );
    expect(await screen.findByText('Level 2 saved.')).toBeTruthy();
  });

  it('compara un nivel anterior contra el presente', async () => {
    makeRepo([{ level: 1, base: { nivel: 1, atk: 10 }, at: 'now' }]);
    const current = { ...profile, base: { nivel: 3, atk: 30 } } as BaseProfile;

    render(<LevelHistoryPanel template={template} profile={current} onLevelUp={vi.fn()} />);

    const pastSelect = screen.getByLabelText('Past level') as HTMLSelectElement;
    await waitFor(() => expect(pastSelect.disabled).toBe(false));
    fireEvent.change(pastSelect, { target: { value: '1' } });

    expect(await screen.findByText(/Past · Level 1/)).toBeTruthy();
    expect(screen.getByText(/↓ −20/)).toBeTruthy();
  });
});
