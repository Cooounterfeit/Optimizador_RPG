import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

import { SlotPicker } from './SlotPicker';
import { sheetCopy } from './copy';

const workspaceRoot = (() => {
  const cwd = process.cwd();
  const candidates = [cwd, resolve(cwd, '..'), resolve(cwd, '../..'), resolve(cwd, '../../..')];
  const found = candidates.find((candidate) =>
    existsSync(resolve(candidate, 'apps/web/public/seeds/gacha-demo.zenith.json')),
  );
  if (!found) throw new Error('Workspace root not found');
  return found;
})();

const seed = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'apps/web/public/seeds/gacha-demo.zenith.json'), 'utf8'),
) as { template: GameTemplate; items: Item[] };

const flower = seed.template.slots.find((slot) => slot.id === 'flower')!;
const flowers = seed.items.filter((item) => item.slot === 'flower');

const renderPicker = (props: Partial<Parameters<typeof SlotPicker>[0]> = {}) => {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <SlotPicker
      template={seed.template}
      slot={flower}
      items={flowers}
      equipment={{}}
      onPick={onPick}
      onClose={onClose}
      {...props}
    />,
  );
  return { onPick, onClose };
};

describe('SlotPicker', () => {
  it('lista las piezas con sus estadisticas', () => {
    renderPicker();

    expect(screen.getByRole('button', { name: /Astral Bloom/ })).toBeTruthy();
    expect(screen.getByText(/HP 800/)).toBeTruthy();
    expect(screen.getByText(/HP 600/)).toBeTruthy();
  });

  it('filtra por nombre', () => {
    renderPicker();

    fireEvent.change(screen.getByPlaceholderText(sheetCopy.picker.search), {
      target: { value: 'void' },
    });

    expect(screen.queryByRole('button', { name: /Astral Bloom/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Void Bloom/ })).toBeTruthy();
  });

  it('permite dejar la ranura vacia', () => {
    const { onPick } = renderPicker();

    fireEvent.click(screen.getByRole('button', { name: sheetCopy.picker.clear }));

    expect(onPick).toHaveBeenCalledWith('');
  });

  it('cierra con Escape', () => {
    const { onClose } = renderPicker();

    fireEvent.keyDown(screen.getByPlaceholderText(sheetCopy.picker.search), { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('avisa cuando no hay piezas para la ranura', () => {
    renderPicker({ items: [] });

    expect(screen.getByText(sheetCopy.picker.empty)).toBeTruthy();
  });

  it('marca la pieza que ya esta puesta en otra ranura', () => {
    renderPicker({
      items: [{ ...flowers[0], id: 'used' }],
      equipment: { weapon: 'used' },
    });

    expect(screen.getByText(sheetCopy.picker.equippedElsewhere)).toBeTruthy();
  });
});
