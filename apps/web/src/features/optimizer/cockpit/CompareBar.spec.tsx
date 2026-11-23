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
        builds={[build(['b1', 'b2'], 120, 40, 130), build(['a1', 'a2'], 100, 50, 100)]}
      />,
    );

    expect(screen.getByText('Compare builds')).toBeTruthy();
    expect(screen.getByLabelText('Build A')).toBeTruthy();
    expect(screen.getByLabelText('Build B')).toBeTruthy();
    expect(screen.queryByText('Equipment')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Compare builds' }));

    expect(screen.getByText('Equipment')).toBeTruthy();
    expect(screen.getAllByText('2 of 2 pieces differ').length).toBe(1);
    expect(screen.getAllByText('−30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('−20').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+10').length).toBeGreaterThan(0);
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

  it('compara la build equipada aunque no salga de la busqueda', () => {
    render(
      <CompareBar
        template={template}
        objective={objective}
        items={[...items, item('c1', 'Club'), item('c2', 'Mail')]}
        builds={[build(['a1', 'a2'], 100, 50, 100), build(['b1', 'b2'], 120, 40, 130)]}
        equipped={build(['c1', 'c2'], 90, 60, 95)}
      />,
    );

    expect(screen.getAllByText('Equipped · 95').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Build A'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compare builds' }));

    // El puntaje se sigue viendo como numero: la marca vive en el selector.
    expect(screen.getByText('95', { exact: true })).toBeTruthy();
  });

  it('marca la build equipada cuando tambien salio de la busqueda', () => {
    const best = build(['a1', 'a2'], 100, 50, 100);
    render(
      <CompareBar
        template={template}
        objective={objective}
        items={items}
        builds={[build(['b1', 'b2'], 120, 40, 130), best]}
        equipped={best}
      />,
    );

    expect(screen.getAllByText('#02 · 100 · Equipped').length).toBeGreaterThan(0);
  });
});
