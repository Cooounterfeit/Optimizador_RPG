import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Evaluacion } from '@zenith/core-engine';
import type { BaseProfile, GameTemplate, Item } from '@zenith/shared-types';

import { SheetStats } from './SheetStats';
import { sheetCopy } from './copy';

const template = {
  schemaVersion: '0.1',
  gameId: 'g',
  name: 'Game',
  description: '',
  stats: [
    { id: 'atk', name: 'ATK', unit: 'flat', group: 'Offense' },
    { id: 'hp', name: 'HP', unit: 'flat', group: 'Survival' },
  ],
  slots: [{ id: 'weapon', name: 'Weapon' }],
  sets: [],
  derived: [{ id: 'eff', name: 'Effective ATK', formula: 'atk', group: 'Formulas' }],
  objectives: [
    {
      id: 'damage',
      name: 'Damage score',
      description: '',
      kind: 'linear',
      formula: 'atk',
      decimals: 0,
    },
  ],
  baseProfiles: [{ id: 'p', name: 'Hero', base: { atk: 5, hp: 100 } }],
  constrainableStats: ['atk'],
  budgets: [{ statId: 'atk', max: 10 }],
} as unknown as GameTemplate;

const profile = template.baseProfiles[0] as BaseProfile;

const itemsById = new Map<string, Item>([
  [
    'blade',
    {
      id: 'blade',
      slot: 'weapon',
      setId: null,
      name: 'Blade',
      stats: { atk: 20 },
      requires: { atk: 40 },
    } as Item,
  ],
]);

const evaluation: Evaluacion = {
  finalStats: { atk: 30, hp: 120 },
  vars: new Map([['eff', 42]]),
  objetivos: { damage: 99 },
  conjuntos: [{ name: 'Astral Core', pieces: 2, tiers: ['2pc'] }],
};

const renderStats = (overrides: Partial<Parameters<typeof SheetStats>[0]> = {}) =>
  render(
    <SheetStats
      template={template}
      profile={profile}
      equipment={{ weapon: 'blade' }}
      itemsById={itemsById}
      evaluation={evaluation}
      evaluating={false}
      error={null}
      {...overrides}
    />,
  );

describe('SheetStats', () => {
  it('agrupa las estadisticas y los calculados por su grupo', () => {
    renderStats();

    expect(screen.getByText('Offense')).toBeTruthy();
    expect(screen.getByText('Survival')).toBeTruthy();
    expect(screen.getByText('Formulas')).toBeTruthy();
    expect(screen.getByText('Effective ATK')).toBeTruthy();
  });

  it('muestra el valor de cada objetivo', () => {
    renderStats();

    expect(screen.getByText('Damage score')).toBeTruthy();
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('lista los conjuntos activos', () => {
    renderStats();

    expect(screen.getByText(/Astral Core · 2 · 2pc/)).toBeTruthy();
  });

  it('avisa los requisitos sin cumplir y el presupuesto excedido', () => {
    renderStats();

    expect(screen.getByText(sheetCopy.requirementsTitle)).toBeTruthy();
    expect(screen.getByText('Blade requires 40 ATK')).toBeTruthy();
    expect(screen.getByText(sheetCopy.budgetTitle)).toBeTruthy();
    expect(screen.getByText('ATK: 25 of 10')).toBeTruthy();
  });

  it('dice que esta calculando mientras evalua', () => {
    renderStats({ evaluation: null, evaluating: true });

    expect(screen.getByText(sheetCopy.calculating)).toBeTruthy();
  });

  it('muestra el error de evaluacion', () => {
    renderStats({ evaluation: null, error: sheetCopy.evaluationFailed });

    expect(screen.getByRole('alert').textContent).toBe(sheetCopy.evaluationFailed);
  });
});
