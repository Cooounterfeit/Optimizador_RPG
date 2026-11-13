import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { setProfileBaseRepository } from './repositories';
import { CharacterPickerDialog } from './CharacterPicker';

const template = {
  gameId: 'g1',
  name: 'Astral Forge',
  stats: [
    { id: 'hp', name: 'HP', unit: 'flat' },
    { id: 'atk', name: 'ATK', unit: 'flat' },
    { id: 'critRate', name: 'CRIT', unit: 'percent' },
  ],
  baseProfiles: [
    { id: 'nova', name: 'Nova', base: { nivel: 1, hp: 5000, atk: 300, critRate: 5 } },
    { id: 'orion', name: 'Orion', base: { nivel: 1, hp: 6000, atk: 280, critRate: 5 } },
  ],
  leveling: { levelKey: 'nivel', min: 1, max: 90, growth: { hp: '10', atk: '1' } },
} as unknown as GameTemplate;

const profiles = template.baseProfiles as unknown as BaseProfile[];

const useBases = (bases: Record<string, Record<string, number>> = {}) =>
  setProfileBaseRepository({
    get: vi.fn(async (_gameId: string, profileId: string) => bases[profileId]),
    save: vi.fn(async () => undefined),
    removeProfile: vi.fn(async () => undefined),
    removeByGame: vi.fn(async () => undefined),
  });

const renderPicker = (currentId = 'nova', onSelect = vi.fn(), onClose = vi.fn()) => {
  render(
    <CharacterPickerDialog
      template={template}
      currentId={currentId}
      open
      onSelect={onSelect}
      onClose={onClose}
    />,
  );
  return { onSelect, onClose };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CharacterPickerDialog', () => {
  it('lista todos los personajes con sus datos y marca el elegido', async () => {
    useBases();
    renderPicker();

    expect(screen.getByRole('heading', { name: 'Astral Forge' })).toBeTruthy();
    expect(await screen.findByText(/HP 5,000 · ATK 300 · CRIT 5%/)).toBeTruthy();
    expect(screen.getByText(/HP 6,000 · ATK 280 · CRIT 5%/)).toBeTruthy();

    const chosen = screen.getByRole('button', { name: /^Nova/ });
    expect(chosen.getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: /^Orion/ }).getAttribute('aria-current')).toBeNull();
  });

  it('muestra el nivel guardado de cada personaje, no el de la plantilla', async () => {
    useBases({ orion: { nivel: 90, hp: 6780, atk: 340 } });
    renderPicker();

    const orion = screen.getByRole('button', { name: /^Orion/ });
    await waitFor(() => expect(orion.textContent).toContain('Level 90'));
    expect(screen.getByRole('button', { name: /^Nova/ }).textContent).toContain('Level 1');
    expect(orion.textContent).not.toContain(String(profiles[1].base.atk));
  });

  it('elige un personaje y cierra con la ×', async () => {
    useBases();
    const { onSelect, onClose } = renderPicker();
    await screen.findByText(/HP 5,000 · ATK 300 · CRIT 5%/);

    fireEvent.click(screen.getByRole('button', { name: /^Orion/ }));
    expect(onSelect).toHaveBeenCalledWith('orion');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('avisa si no se pudieron leer los niveles guardados', async () => {
    setProfileBaseRepository({
      get: vi.fn(async () => {
        throw new Error('offline');
      }),
      save: vi.fn(async () => undefined),
      removeProfile: vi.fn(async () => undefined),
      removeByGame: vi.fn(async () => undefined),
    });
    renderPicker();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Orion/ }).textContent).toContain('Level 1');
  });
});
