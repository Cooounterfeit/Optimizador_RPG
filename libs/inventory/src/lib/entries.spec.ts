import { describe, expect, it } from 'vitest';

import type { InventoryCatalog } from './catalog';
import {
  InventoryEntrySchema,
  entryItem,
  entryStats,
  entryStatsByKey,
  listEntries,
  type InventoryEntry,
} from './entries';
import { InventoryRulesSchema, type InventoryRules } from './rules';

const rules: InventoryRules = InventoryRulesSchema.parse({
  format: 'good',
  weaponSlot: 'slot-a',
  ascensionLevels: [5, 10],
});

const entry: InventoryEntry = {
  key: 'star-blade',
  name: 'Star Blade',
  rarity: 5,
  type: 'blade',
  slot: 'slot-a',
  maxLevel: 10,
  stats: {
    power: { base: 10, curve: 'growth' },
    haste: { base: 0.05, curve: 'growth', percent: true },
    armor: { value: 7 },
    focus: { base: 10, curve: 'growth', ascension: [0, 5, 10] },
  },
  requires: { blade: 1 },
};

const catalog: InventoryCatalog = {
  kind: 'inventory',
  entries: [
    { ...entry, key: 'zeta', name: 'Zeta' },
    { ...entry, key: 'star-blade', name: 'Star Blade' },
  ],
  curves: {
    '1': { growth: 1 },
    '10': { growth: 2 },
    '11': { growth: 2 },
  },
};

describe('listEntries', () => {
  it('ordena por nombre', () => {
    expect(listEntries(catalog).map((item) => item.name)).toEqual(['Star Blade', 'Zeta']);
  });
});

describe('entryStats', () => {
  it('aplica curva, porcentaje, valor fijo y ascension', () => {
    expect(entryStats(entry, catalog.curves, 10, 1, rules)).toEqual({
      power: 20,
      haste: 10,
      armor: 7,
      focus: 25,
    });
  });

  it('usa el escalon de ascension de las reglas si no se indica', () => {
    expect(entryStats(entry, catalog.curves, 10, undefined, rules)).toMatchObject({
      focus: 25,
    });
  });

  it('devuelve vacio si la entrada no existe', () => {
    expect(entryStatsByKey(catalog, rules, 'nope', 10)).toEqual({});
  });
});

describe('entryItem', () => {
  it('crea la pieza con ranura, requisito y stats', () => {
    const item = entryItem(catalog, rules, 'star-blade', 10);

    expect(item).not.toBeNull();
    expect(item?.slot).toBe('slot-a');
    expect(item?.name).toBe('Star Blade · Lv. 10');
    expect(item?.rarity).toBe(5);
    expect(item?.requires).toEqual({ blade: 1 });
    expect(item?.stats.power).toBe(20);
  });

  it('respeta la ranura indicada', () => {
    expect(entryItem(catalog, rules, 'star-blade', 10, 'slot-b')?.slot).toBe('slot-b');
  });

  it('devuelve null si la entrada no existe', () => {
    expect(entryItem(catalog, rules, 'nope', 10)).toBeNull();
  });
});

describe('InventoryEntrySchema', () => {
  it('rechaza un stat sin value ni base', () => {
    const result = InventoryEntrySchema.safeParse({
      ...entry,
      stats: { power: {} },
    });

    expect(result.success).toBe(false);
  });
});
