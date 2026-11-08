import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GameTemplate } from '@zenith/shared-types';

import { CatalogPanel } from './CatalogPanel';

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'genshin',
  name: 'Genshin Impact',
  description: '',
  stats: [
    { id: 'atk', name: 'Attack', unit: 'flat' },
    { id: 'atk_', name: 'ATK', unit: 'percent' },
  ],
  slots: [
    { id: 'weapon', name: 'Weapon' },
    { id: 'flower', name: 'Flower' },
  ],
  sets: [
    {
      id: 'GladiatorsFinale',
      name: 'Gladiator',
      tiers: [{ pieces: 2, label: '2 pieces', effects: { atk_: 20 } }],
    },
  ],
  derived: [],
  objectives: [],
  baseProfiles: [],
  constrainableStats: [],
};

describe('CatalogPanel', () => {
  it('busca armas por nombre', async () => {
    render(<CatalogPanel template={template} onAdd={vi.fn()} />);

    expect(await screen.findByText("Wolf's Gravestone")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search catalog'), {
      target: { value: 'zzz-no-existe' },
    });

    expect(await screen.findByText('No weapons match those filters.')).toBeTruthy();
  });

  it('agrega un arma con el nivel elegido', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<CatalogPanel template={template} onAdd={onAdd} />);

    const row = (await screen.findByText("Wolf's Gravestone")).closest('li');
    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Add' }));
    const level = within(row as HTMLElement).getByRole('spinbutton');
    fireEvent.change(level, { target: { value: '90' } });
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    const added = onAdd.mock.calls[0][0];
    expect(added.name).toBe("Wolf's Gravestone · Lv. 90");
    expect(added.slot).toBe('weapon');
    expect(added.requires).toEqual({ wt_claymore: 1 });
  });

  it('muestra los conjuntos con sus bonos', async () => {
    render(<CatalogPanel template={template} onAdd={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Sets/ }));

    expect(await screen.findByText('Gladiator')).toBeTruthy();
    expect(screen.getByText(/2pc/)).toBeTruthy();
    expect(screen.getByText(/ATK \+20%/)).toBeTruthy();
  });
});
