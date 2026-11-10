import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DamageCalculator, GameTemplate } from '@zenith/shared-types';

import { useGame } from '../game/useGame';
import { DamageCalculatorPage } from './DamageCalculatorPage';

vi.mock('../game/useGame', () => ({ useGame: vi.fn() }));

const withCrit: DamageCalculator = {
  title: 'Damage per hit',
  description: 'Estimate one hit.',
  fields: [
    { id: 'attack', label: 'Attack', default: 0, min: 0 },
    { id: 'baseDamage', label: 'Base damage', default: 0, min: 0 },
    { id: 'critDamage', label: 'Additional crit damage', unit: 'percent', default: 0, min: 0 },
    { id: 'critChance', label: 'Crit chance', unit: 'percent', default: 0, min: 0, max: 100 },
    { id: 'defense', label: 'Enemy defense', default: 0, min: 0 },
  ],
  outputs: [
    {
      id: 'withoutCrit',
      label: 'Damage without crit',
      formula: 'max(0, attack + baseDamage - defense)',
    },
    {
      id: 'withCrit',
      label: 'Damage with crit',
      formula: 'max(0, (attack + baseDamage) * (1 + critDamage / 100) - defense)',
    },
    {
      id: 'average',
      label: 'Average damage per hit',
      formula: 'withoutCrit * (1 - critChance / 100) + withCrit * (critChance / 100)',
    },
  ],
};

const withoutCrit: DamageCalculator = {
  title: 'Hit damage',
  fields: [
    { id: 'attack', label: 'Attack', default: 0, min: 0 },
    { id: 'defense', label: 'Enemy defense', default: 0, min: 0 },
  ],
  outputs: [{ id: 'hit', label: 'Damage', formula: 'max(0, attack - defense)' }],
};

const mockGame = (calculator?: DamageCalculator) => {
  vi.mocked(useGame).mockReturnValue({
    state: {
      status: 'ready',
      template: { damageCalculator: calculator } as GameTemplate,
      sampleItems: [],
    },
    retry: vi.fn(),
  });
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/optimizer/gacha-demo/dano']}>
      <Routes>
        <Route path="/optimizer/:id/dano" element={<DamageCalculatorPage />} />
      </Routes>
    </MemoryRouter>,
  );

const fill = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe('DamageCalculatorPage', () => {
  beforeEach(() => mockGame(withCrit));

  it('calcula desde la definicion del juego', () => {
    renderPage();
    fill('Attack', '50');
    fill('Base damage', '100');
    fill('Additional crit damage (%)', '50');
    fill('Crit chance (%)', '50');
    fill('Enemy defense', '20');

    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

    expect(screen.getByText('167.5')).toBeTruthy();
    expect(screen.getByText('Damage without crit')).toBeTruthy();
    expect(screen.getByText('130')).toBeTruthy();
    expect(screen.getByText('Damage with crit')).toBeTruthy();
    expect(screen.getByText('205')).toBeTruthy();
  });

  it('no muestra criticos si el juego no los declara', () => {
    mockGame(withoutCrit);
    renderPage();

    expect(screen.queryByLabelText('Crit chance (%)')).toBeNull();
    expect(screen.queryByLabelText('Additional crit damage (%)')).toBeNull();

    fill('Attack', '50');
    fill('Enemy defense', '20');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

    expect(screen.getByText('30')).toBeTruthy();
  });

  it('avisa si el juego no declara calculadora', () => {
    mockGame(undefined);
    renderPage();

    expect(screen.getByText('This game has no damage calculator')).toBeTruthy();
  });

  it('rechaza un valor no numerico', () => {
    renderPage();
    fill('Attack', 'abc');

    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

    expect(screen.getByRole('alert').textContent).toContain('Enter a valid number');
  });

  it('ajusta un valor fuera de los limites declarados', () => {
    renderPage();
    fill('Crit chance (%)', '150');

    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

    expect((screen.getByLabelText('Crit chance (%)') as HTMLInputElement).value).toBe('100');
    expect(screen.getByRole('status').textContent).toContain('adjusted');
  });
});
