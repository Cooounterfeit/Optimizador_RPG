import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { StatsPanel } from './StatsPanel';

const template = {
  stats: [
    { id: 'atk', name: 'ATK', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
  ],
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

  it('proyecta las estadísticas a un nivel futuro', () => {
    render(<StatsPanel template={template} profile={profile} />);

    fireEvent.change(screen.getByLabelText('Future level'), { target: { value: '3' } });

    expect(screen.getByText('Projected')).toBeTruthy();
    const atkRow = screen.getByRole('row', { name: /ATK/ });
    expect(within(atkRow).getByText('30')).toBeTruthy();
    expect(within(atkRow).getByText(/↑ \+20/)).toBeTruthy();
  });

  it('explica cuando no hay niveles o stats base', () => {
    const sinNiveles = { stats: template.stats } as unknown as GameTemplate;
    render(<StatsPanel template={sinNiveles} profile={profile} />);

    expect(screen.getByText(/Future simulation is not available/)).toBeTruthy();
    expect((screen.getByLabelText('Future level') as HTMLSelectElement).disabled).toBe(true);
  });

  it('muestra un mensaje si el perfil no tiene stats', () => {
    const sinStats = { ...profile, base: { nivel: 1 } } as BaseProfile;
    render(<StatsPanel template={template} profile={sinStats} />);

    expect(screen.getByText(/This game has no stats/)).toBeTruthy();
  });
});
