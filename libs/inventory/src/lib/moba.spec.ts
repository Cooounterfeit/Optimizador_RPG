import type { GameTemplate } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import type { InventoryCatalog } from './catalog';
import { importGood } from './formats/good';

/**
 * Un juego de otro genero, definido solo con datos. No hay ninguna rama de
 * codigo para "moba": las ranuras, los stats y las reglas son del catalogo.
 */
const template: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'moba-demo',
  name: 'Moba Demo',
  description: '',
  stats: [
    { id: 'attackDamage', name: 'Attack Damage', unit: 'flat' },
    { id: 'abilityPower', name: 'Ability Power', unit: 'flat' },
    { id: 'armor', name: 'Armor', unit: 'flat' },
  ],
  slots: [{ id: 'item', name: 'Item' }],
  sets: [],
  derived: [],
  objectives: [],
  baseProfiles: [{ id: 'hero', name: 'Hero', base: { attackDamage: 60 } }],
  constrainableStats: ['attackDamage'],
  extensions: {
    inventory: {
      kind: 'inventory',
      catalogUrl: '/moba/catalog.json',
      rules: {
        format: 'good',
        weaponSlot: 'item',
        slots: { item: 'item' },
        stats: { ad: 'attackDamage', armor: 'armor' },
        rarities: [1, 2, 3],
        artifactLevelRange: { min: 1, max: 1 },
        itemLevelRange: { min: 1, max: 18 },
        ascensionLevels: [],
        mainStats: {
          ad: { '3': [[0, 10], [1, 10]] },
        },
        labels: { entry: 'Item', entries: 'Items' },
      },
    },
  },
};

const catalog: InventoryCatalog = {
  kind: 'inventory',
  entries: [
    {
      key: 'long-sword',
      name: 'Long Sword',
      rarity: 3,
      type: 'weapon',
      slot: 'item',
      maxLevel: 1,
      stats: { attackDamage: { value: 40 } },
    },
  ],
  curves: {},
};

describe('inventario de otro genero', () => {
  it('importa artefactos y entradas solo con reglas de datos', () => {
    const result = importGood(
      {
        format: 'GOOD',
        artifacts: [
          {
            setKey: 'starter',
            rarity: 3,
            level: 1,
            slotKey: 'item',
            mainStatKey: 'ad',
            substats: [{ key: 'armor', value: 5 }],
          },
        ],
        weapons: [{ key: 'long-sword', level: 1 }],
      },
      template,
      catalog,
    );

    expect(result.artifacts).toBe(1);
    expect(result.entries).toBe(1);
    expect(result.items[0]).toMatchObject({
      slot: 'item',
      name: 'Item +1 · Attack Damage',
      stats: { attackDamage: 10, armor: 5 },
    });
    expect(result.items[1]).toMatchObject({
      slot: 'item',
      name: 'Long Sword · Lv. 1',
      stats: { attackDamage: 40 },
    });
  });
});
