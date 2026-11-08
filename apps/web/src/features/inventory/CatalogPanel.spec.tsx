import { clearInventoryCatalogCache, type InventoryCatalog } from '@zenith/inventory';
import type { GameTemplate } from '@zenith/shared-types';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogPanel } from './CatalogPanel';

const catalog: InventoryCatalog = {
  kind: 'inventory',
  entries: [
    {
      key: 'starlight-blade',
      name: 'Starlight Blade',
      rarity: 5,
      type: 'sword',
      slot: 'weapon',
      maxLevel: 90,
      stats: {
        weaponAtk: {
          base: 46,
          curve: 'growth',
          ascension: [0, 12, 24, 36, 48, 60, 72],
        },
        critRate: { base: 0.072, curve: 'growth', percent: true },
      },
      requires: { blade: 1 },
    },
  ],
  curves: { '1': { growth: 1 }, '90': { growth: 2.5 } },
};

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'gacha-demo',
  name: 'Astral Forge',
  description: '',
  stats: [
    { id: 'atk', name: 'Attack', unit: 'flat' },
    { id: 'atk_', name: 'ATK', unit: 'percent' },
    { id: 'critRate', name: 'CRIT Rate', unit: 'percent' },
    { id: 'weaponAtk', name: 'Weapon ATK', unit: 'flat' },
  ],
  slots: [
    { id: 'weapon', name: 'Weapon' },
    { id: 'flower', name: 'Flower' },
  ],
  sets: [
    {
      id: 'astral-core',
      name: 'Astral Core',
      tiers: [{ pieces: 2, label: '2 pieces', effects: { atk_: 20 } }],
    },
  ],
  derived: [],
  objectives: [],
  baseProfiles: [],
  constrainableStats: [],
  extensions: {
    inventory: {
      kind: 'inventory',
      catalogUrl: '/test-catalog.json',
      rules: {
        format: 'good',
        weaponSlot: 'weapon',
        setIconSlot: 'flower',
        slots: { flower: 'flower' },
        stats: { critRate: 'critRate' },
        labels: { entries: 'Weapons', sets: 'Sets', entry: 'Weapon' },
      },
    },
  },
};

beforeEach(() => {
  clearInventoryCatalogCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => catalog })),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('CatalogPanel', () => {
  it('busca entradas por nombre', async () => {
    render(<CatalogPanel template={template} onAdd={vi.fn()} />);

    expect(await screen.findByText('Starlight Blade')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search catalog'), {
      target: { value: 'zzz-no-existe' },
    });

    expect(await screen.findByText('No items match those filters.')).toBeTruthy();
  });

  it('agrega una entrada con el nivel elegido', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<CatalogPanel template={template} onAdd={onAdd} />);

    const row = (await screen.findByText('Starlight Blade')).closest('li');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Add' }));
    const level = within(row as HTMLElement).getByRole('spinbutton');
    fireEvent.change(level, { target: { value: '90' } });
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    const added = onAdd.mock.calls[0][0];
    expect(added.name).toBe('Starlight Blade · Lv. 90');
    expect(added.slot).toBe('weapon');
    expect(added.requires).toEqual({ blade: 1 });
  });

  it('muestra los conjuntos con sus bonos', async () => {
    render(<CatalogPanel template={template} onAdd={vi.fn()} />);

    await screen.findByText('Starlight Blade');
    fireEvent.click(screen.getByRole('button', { name: /Sets/ }));

    expect(await screen.findByText('Astral Core')).toBeTruthy();
    expect(screen.getByText(/2pc/)).toBeTruthy();
    expect(screen.getByText(/ATK \+20%/)).toBeTruthy();
  });

  it('avisa cuando el juego no publica catalogo', async () => {
    render(<CatalogPanel template={{ ...template, extensions: {} }} onAdd={vi.fn()} />);

    expect(await screen.findByText('This game has no catalog')).toBeTruthy();
  });
});
