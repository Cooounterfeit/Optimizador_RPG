import type { GameTemplate } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import type { InventoryCatalog } from '../catalog';
import { goodKey, importGood } from './good';

const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'demo',
  name: 'Demo',
  description: '',
  stats: [
    { id: 'might', name: 'Might', unit: 'flat' },
    { id: 'haste', name: 'Haste', unit: 'percent' },
    { id: 'power', name: 'Power', unit: 'flat' },
  ],
  slots: [
    { id: 'slot-a', name: 'Slot A' },
    { id: 'slot-b', name: 'Slot B' },
  ],
  sets: [],
  derived: [],
  objectives: [],
  baseProfiles: [{ id: 'p', name: 'P', base: {} }],
  constrainableStats: [],
  extensions: {
    inventory: {
      kind: 'inventory',
      catalogUrl: '/catalog.json',
      rules: {
        format: 'good',
        weaponSlot: 'slot-a',
        slots: { 'slot-a': 'slot-a' },
        stats: { might: 'might', haste: 'haste' },
        mainStats: {
          might: {
            '5': [[0, 100], [20, 500]],
            '4': [[0, 50], [16, 250]],
          },
        },
        ascensionLevels: [5, 10],
      },
    },
  },
};

const catalog: InventoryCatalog = {
  kind: 'inventory',
  entries: [
    {
      key: 'star-blade',
      name: 'Star Blade',
      rarity: 5,
      type: 'blade',
      slot: 'slot-a',
      maxLevel: 10,
      stats: {
        power: { base: 10, curve: 'growth', ascension: [0, 5, 10] },
      },
      requires: { blade: 1 },
    },
  ],
  curves: {
    '1': { growth: 1 },
    '10': { growth: 2 },
  },
};

const good = {
  format: 'GOOD',
  artifacts: [
    {
      setKey: 'set-a',
      rarity: 5,
      level: 20,
      slotKey: 'slot-a',
      mainStatKey: 'might',
      substats: [{ key: 'haste', value: 3 }],
    },
    {
      setKey: 'set-b',
      rarity: 4,
      level: 0,
      slotKey: 'slot-b',
      mainStatKey: 'might',
      substats: [],
    },
  ],
  weapons: [{ key: 'star-blade', level: 10, ascension: 1 }],
};

describe('importGood', () => {
  it('convierte artefactos y entradas en piezas del inventario', () => {
    const result = importGood(good, template, catalog);

    expect(result.total).toBe(3);
    expect(result.artifacts).toBe(2);
    expect(result.entries).toBe(1);
    expect(result.skipped).toBe(0);

    const first = result.items[0];
    expect(first.slot).toBe('slot-a');
    expect(first.setId).toBe('set-a');
    expect(first.rarity).toBe(5);
    expect(first.level).toBe(20);
    expect(first.name).toBe('Slot A +20 · Might');
    expect(first.stats.might).toBe(500);
    expect(first.stats.haste).toBe(3);

    const second = result.items[1];
    expect(second.slot).toBe('slot-b');
    expect(second.stats.might).toBe(50);

    const item = result.items[2];
    expect(item.slot).toBe('slot-a');
    expect(item.setId).toBeNull();
    expect(item.name).toBe('Star Blade · Lv. 10');
    expect(item.requires).toEqual({ blade: 1 });
    expect(item.stats.power).toBe(25);
  });

  it('respeta el nivel minimo de artefactos', () => {
    const result = importGood(good, template, catalog, { minLevel: 20 });

    expect(result.artifacts).toBe(1);
    expect(result.entries).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('respeta la rareza minima', () => {
    const result = importGood(good, template, catalog, { minRarity: 5 });

    expect(result.artifacts).toBe(1);
    expect(result.entries).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('puede omitir las entradas', () => {
    const result = importGood(good, template, catalog, { includeEntries: false });

    expect(result.entries).toBe(0);
    expect(result.items).toHaveLength(2);
  });

  it('cuenta las entradas desconocidas como descartadas', () => {
    const result = importGood(
      { artifacts: [], weapons: [{ key: 'nope', level: 1 }] },
      template,
      catalog,
    );

    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('rechaza un archivo que no es objeto o una plantilla sin reglas', () => {
    expect(() => importGood(null, template, catalog)).toThrow(/not a JSON object/);
    expect(() => importGood('GOOD', template, catalog)).toThrow(/not a JSON object/);
    expect(() => importGood(good, { ...template, extensions: {} }, catalog)).toThrow(
      /does not declare inventory rules/,
    );
  });
});

describe('goodKey', () => {
  it('convierte nombres a claves', () => {
    expect(goodKey("Star's Blade")).toBe('StarsBlade');
    expect(goodKey('Astral Core')).toBe('AstralCore');
  });
});
