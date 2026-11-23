import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BuildResult, GameTemplate, Item } from '@zenith/shared-types';

import { CompareBar } from './CompareBar';

const template = {
  stats: [
    { id: 'atk', name: 'ATK', unit: 'flat' },
    { id: 'hp', name: 'HP', unit: 'flat' },
  ],
  slots: [
    { id: 'weapon', name: 'Weapon' },
    { id: 'armor', name: 'Armor' },
  ],
} as unknown as GameTemplate;

const objective = { id: 'damage', name: 'Damage', unit: 'flat' } as GameTemplate['objectives'][number];

const item = (id: string, name: string): Item => ({ id, name, stats: {} }) as unknown as Item;

const build = (itemIds: string[], atk: number, hp: number, score: number): BuildResult =>
  ({ itemIds, score, finalStats: { atk, hp }, activeSets: [] }) as unknown as BuildResult;

const items = [item('a1', 'Blade'), item('a2', 'Mail'), item('b1', 'Axe'), item('b2', 'Mail')];

describe('CompareBar', () => {
  it('arranca cerrada y al abrirla compara equipamiento y stats', () => {
    render(
      <CompareBar
        template={template}
        objective={objective}
        items={items}
        builds={[build(['a1', 'a2'], 100, 50, 100), build(['b1', 'b2'], 120, 40, 130)]}
      />,
    );

    expect(screen.getByText('Compare builds')).toBeTruthy();
    expect(screen.getByLabelText('Build A')).toBeTruthy();
    expect(screen.getByLabelText('Build B')).toBeTruthy();
    expect(screen.queryByText('Equipment')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Compare builds' }));

    expect(screen.getByText('Equipment')).toBeTruthy();
    expect(screen.getAllByText('2 of 2 pieces differ').length).toBe(1);
    expect(screen.getAllByText('+30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+20').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−10').length).toBeGreaterThan(0);
    expect(screen.getByText('Axe')).toBeTruthy();
    expect(screen.getByText('Blade')).toBeTruthy();
  });

  it('avisa cuando las dos builds son iguales', () => {
    const same = build(['a1', 'a2'], 100, 50, 100);
    render(<CompareBar template={template} objective={objective} items={items} builds={[same, same]} />);

    expect(screen.getByText('These builds are identical.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Compare builds' }));

    expect(screen.getByText('Same equipment')).toBeTruthy();
    expect(screen.queryByText('These builds are identical.')).toBeNull();
  });

  it('avisa cuando solo hay una build', () => {
    render(
      <CompareBar
        template={template}
        objective={objective}
        items={items}
        builds={[build(['a1', 'a2'], 100, 50, 100)]}
      />,
    );

    expect(screen.getByText(/Only one build was found/)).toBeTruthy();
    expect(screen.queryByLabelText('Build A')).toBeNull();
  });
});
