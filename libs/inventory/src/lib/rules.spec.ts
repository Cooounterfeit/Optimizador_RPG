import type { GameTemplate } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import {
  ascensionStep,
  inventoryRules,
  mainStatValue,
  mapSlot,
  mapStat,
  InventoryRulesSchema,
  type InventoryRules,
} from './rules';

const rules: InventoryRules = InventoryRulesSchema.parse({
  format: 'good',
  slots: { 'slot-a': 'slot-a' },
  stats: { might: 'might' },
  mainStats: {
    might: { '5': [[0, 100], [20, 500]] },
  },
});

const template = (extensions?: Record<string, unknown>): GameTemplate =>
  ({
    schemaVersion: '0.1',
    gameId: 'demo',
    name: 'Demo',
    description: '',
    stats: [],
    slots: [],
    sets: [],
    derived: [],
    objectives: [],
    baseProfiles: [{ id: 'p', name: 'P', base: {} }],
    constrainableStats: [],
    extensions,
  }) as GameTemplate;

describe('inventoryRules', () => {
  it('lee las reglas de extensions.inventory', () => {
    const parsed = inventoryRules(
      template({
        inventory: {
          kind: 'inventory',
          catalogUrl: '/catalog.json',
          rules: { mainStats: rules.mainStats },
        },
      }),
    );

    expect(parsed?.mainStats.might['5']).toEqual([[0, 100], [20, 500]]);
  });

  it('devuelve null si no hay inventario', () => {
    expect(inventoryRules(template())).toBeNull();
  });
});

describe('mainStatValue', () => {
  it('interpola entre puntos', () => {
    expect(mainStatValue(rules, 'might', 5, 10)).toBe(300);
  });

  it('recorta en los extremos', () => {
    expect(mainStatValue(rules, 'might', 5, -5)).toBe(100);
    expect(mainStatValue(rules, 'might', 5, 50)).toBe(500);
  });

  it('devuelve cero si falta la curva', () => {
    expect(mainStatValue(rules, 'unknown', 5, 10)).toBe(0);
  });
});

describe('helpers', () => {
  it('mapea ranuras y stats con fallback a la misma clave', () => {
    expect(mapSlot(rules, 'slot-a')).toBe('slot-a');
    expect(mapSlot(rules, 'slot-b')).toBe('slot-b');
    expect(mapStat(rules, 'might')).toBe('might');
    expect(mapStat(rules, 'haste')).toBe('haste');
  });

  it('cuenta los cortes de ascension superados', () => {
    expect(ascensionStep(20, [20, 40, 50])).toBe(0);
    expect(ascensionStep(21, [20, 40, 50])).toBe(1);
    expect(ascensionStep(90, [20, 40, 50])).toBe(3);
    expect(ascensionStep(10, [])).toBe(0);
  });
});
