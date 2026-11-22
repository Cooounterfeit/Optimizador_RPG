import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

import { ItemHoverCard } from './ItemHoverCard';

const template = {
  stats: [
    { id: 'atk', name: 'ATK', unit: 'percent' },
    { id: 'flatAtk', name: 'Flat ATK', unit: 'flat' },
    { id: 'dmg', name: 'DMG', unit: 'flat', aggregate: 'multiply' },
  ],
  slots: [{ id: 'weapon', name: 'Weapon' }],
  sets: [{ id: 'astral', name: 'Astral', tiers: [] }],
} as unknown as GameTemplate;

const item = {
  id: 'i1',
  slot: 'weapon',
  setId: 'astral',
  name: 'Astral Edge',
  rarity: 5,
  level: 20,
  stats: { atk: 12, dmg: 1.5 },
  requires: { flatAtk: 100 },
} as unknown as Item;

const renderRow = (value: Item | undefined) => {
  const result = render(
    <ItemHoverCard template={template} item={value} openDelayMs={0}>
      <span>Astral Edge</span>
    </ItemHoverCard>,
  );
  return { row: result.container.firstElementChild as HTMLElement };
};

describe('ItemHoverCard', () => {
  it('muestra nombre, conjunto y todas las stats al pasar el cursor', () => {
    const { row } = renderRow(item);

    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(row);

    const card = screen.getByRole('tooltip');
    expect(card.parentElement).toBe(document.body);
    expect(row.getAttribute('aria-describedby')).toBe(card.id);
    expect(card.textContent).toContain('Weapon');
    expect(card.textContent).toContain('Astral Edge');
    // Sin assets en la plantilla, el glifo cae al monograma de la pieza.
    expect(card.textContent).toContain('AE');
    expect(card.textContent).toContain('Astral');
    expect(card.textContent).toContain('Lv. 20');
    expect(card.textContent).toContain('12%');
    expect(card.textContent).toContain('×1.5');
    expect(card.textContent).toContain('Requires');
    expect(card.textContent).toContain('100');
  });

  it('se cierra con Escape y al salir del ancla', async () => {
    const { row } = renderRow(item);

    fireEvent.mouseEnter(row);
    expect(screen.getByRole('tooltip')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(row);
    expect(screen.getByRole('tooltip')).toBeTruthy();

    fireEvent.mouseLeave(row);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('abre con el foco de teclado del boton que envuelve', () => {
    render(
      <ItemHoverCard template={template} item={item} as="li" openDelayMs={0}>
        <button type="button">Astral Edge</button>
      </ItemHoverCard>,
    );

    fireEvent.focus(screen.getByRole('button', { name: 'Astral Edge' }));

    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  it('no abre tarjeta cuando la ranura esta vacia', () => {
    const { row } = renderRow(undefined);

    fireEvent.mouseEnter(row);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
