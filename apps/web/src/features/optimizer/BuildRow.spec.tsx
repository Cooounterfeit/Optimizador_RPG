import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BuildResult, GameTemplate, Item } from '@zenith/shared-types';

import { BuildRow } from './BuildRow';

const template = {
  stats: [{ id: 'atk', name: 'ATK', unit: 'flat' }],
  slots: [{ id: 'weapon', name: 'Weapon' }],
  sets: [{ id: 'ember', name: 'Ember', tiers: [] }],
} as unknown as GameTemplate;

const item = {
  id: 'pike',
  slot: 'weapon',
  setId: 'ember',
  name: 'Ashen Pike',
  stats: { atk: 311 },
} as unknown as Item;

const items = new Map([[item.id, item]]);

const build = (score: number, stats: Record<string, number> = { atk: 100 }): BuildResult => ({
  score,
  itemIds: ['pike'],
  finalStats: stats,
  activeSets: [{ setId: 'ember', name: 'Ember', pieces: 2, tiers: [] }],
});

const renderRow = (props: Partial<Parameters<typeof BuildRow>[0]> = {}) =>
  render(
    <ul>
      <BuildRow
        template={template}
        build={build(120)}
        rank={1}
        equipped={false}
        baseline={build(100)}
        provenOptimal
        constraints={[{ statId: 'atk', min: 90 }]}
        items={items}
        open={false}
        onToggle={vi.fn()}
        onEquip={vi.fn()}
        profileName="Nova"
        evaluated={7251}
        elapsedMs={1800}
        {...props}
      />
    </ul>,
  );

describe('BuildRow', () => {
  it('resume la fila con rank, puntaje y diferencia contra lo puesto', () => {
    renderRow();

    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('+20')).toBeTruthy();
    expect(screen.getByRole('button', { name: '#1' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('abre el detalle con piezas, stats y condiciones cumplidas', () => {
    renderRow({ open: true });

    expect(screen.getByText('Ashen Pike')).toBeTruthy();
    expect(screen.getByText('ATK')).toBeTruthy();
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
    expect(screen.getByText('✓')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Equip' })).toBeTruthy();
  });

  it('marca una condicion incumplida', () => {
    renderRow({ open: true, constraints: [{ statId: 'atk', min: 500 }] });

    expect(screen.getByText('✕')).toBeTruthy();
  });

  it('no ofrece equipar la build que ya esta puesta', () => {
    renderRow({ open: true, equipped: true, rank: null, baseline: build(120) });

    expect(screen.getByRole('button', { name: 'Equipped' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Equip' })).toBeNull();
    expect(screen.getByText('Already on Nova')).toBeTruthy();
  });

  it('avisa al abrir y cerrar', () => {
    const onToggle = vi.fn();
    renderRow({ onToggle });

    fireEvent.click(screen.getByRole('button', { name: '#1' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
