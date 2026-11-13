import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { StatsPanel } from './StatsPanel';

const template = {
  stats: [
    { id: 'atk', name: 'ATK', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
  ],
  baseProfiles: [{ id: 'nova', name: 'Nova', base: { nivel: 1, atk: 10, hp: 100 } }],
  leveling: {
    levelKey: 'nivel',
    min: 1,
    max: 10,
    growth: { atk: '10', hp: '100' },
  },
} as unknown as GameTemplate;

const profile = {
  id: 'nova',
  name: 'Nova',
  base: { nivel: 1, atk: 10, hp: 100 },
} as unknown as BaseProfile;

const rows = () => screen.getAllByRole('rowheader').map((row) => row.getAttribute('aria-label'));

describe('StatsPanel', () => {
  it('ordena por valor y permite ordenar por nombre', () => {
    render(<StatsPanel template={template} profile={profile} />);

    expect(rows()).toEqual(['HP', 'ATK']);

    fireEvent.click(screen.getByRole('button', { name: /Stat/ }));
    expect(rows()).toEqual(['ATK', 'HP']);
  });

  it('fija el nivel elegido y guarda la base derivada', async () => {
    const onSaveBase = vi.fn(async () => undefined);
    render(<StatsPanel template={template} profile={profile} onSaveBase={onSaveBase} />);

    fireEvent.change(screen.getByLabelText('Character level'), { target: { value: '3' } });

    await waitFor(() =>
      expect(onSaveBase).toHaveBeenCalledWith(expect.objectContaining({ nivel: 3, atk: 30, hp: 300 })),
    );
  });

  it('permite bajar el nivel de un perfil que ya subió', async () => {
    const onSaveBase = vi.fn(async () => undefined);
    const high = { ...profile, base: { nivel: 9, atk: 90, hp: 900 } } as BaseProfile;
    render(<StatsPanel template={template} profile={high} onSaveBase={onSaveBase} />);

    fireEvent.change(screen.getByLabelText('Character level'), { target: { value: '2' } });

    await waitFor(() =>
      expect(onSaveBase).toHaveBeenCalledWith(expect.objectContaining({ nivel: 2, atk: 20, hp: 200 })),
    );
  });

  it('explica cuando el juego no define niveles', () => {
    const sinNiveles = { stats: template.stats } as unknown as GameTemplate;
    render(<StatsPanel template={sinNiveles} profile={profile} onSaveBase={vi.fn()} />);

    expect(screen.getByText(/Levels are not available/)).toBeTruthy();
    expect((screen.getByLabelText('Character level') as HTMLSelectElement).disabled).toBe(true);
  });

  it('muestra un mensaje si el perfil no tiene stats', () => {
    const sinStats = { ...profile, base: { nivel: 1 } } as BaseProfile;
    render(<StatsPanel template={template} profile={sinStats} />);

    expect(screen.getByText(/This game has no stats/)).toBeTruthy();
  });
});
