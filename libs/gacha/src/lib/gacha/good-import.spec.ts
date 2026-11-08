import { describe, expect, it } from 'vitest';

import { importGood, mainStatValue } from './good-import';
import type { GachaCatalog } from './types';

const catalog: GachaCatalog = {
  kind: 'gacha',
  weaponSlot: 'weapon',
  weapons: [
    {
      key: 'starlight-blade',
      name: 'Starlight Blade',
      rarity: 5,
      type: 'sword',
      maxLevel: 90,
      init: { v: 46, c: 'growth' },
      subInit: { stat: 'critRate_', v: 0.072, c: 'growth', pct: true },
      ascAtk: [0, 0, 0, 0, 0, 0, 0],
    },
  ],
  curves: { '1': { growth: 1 }, '90': { growth: 2.5 } },
};

const good = {
  format: 'GOOD',
  artifacts: [
    {
      setKey: 'astral-core',
      rarity: 5,
      level: 20,
      slotKey: 'flower',
      mainStatKey: 'hp',
      substats: [
        { key: 'critRate_', value: 7.8 },
        { key: 'atk_', value: 5.8 },
      ],
    },
    {
      setKey: 'void-song',
      rarity: 4,
      level: 0,
      slotKey: 'circlet',
      mainStatKey: 'critRate_',
      substats: [],
    },
  ],
  weapons: [{ key: 'starlight-blade', level: 90, ascension: 6, refinement: 1 }],
};

describe('importGood', () => {
  it('convierte artefactos y armas en piezas del inventario', () => {
    const result = importGood(good, catalog);

    expect(result.total).toBe(3);
    expect(result.artifacts).toBe(2);
    expect(result.weapons).toBe(1);
    expect(result.skipped).toBe(0);

    const flower = result.items[0];
    expect(flower.slot).toBe('flower');
    expect(flower.setId).toBe('astral-core');
    expect(flower.rarity).toBe(5);
    expect(flower.level).toBe(20);
    expect(flower.stats.hp).toBe(4780);
    expect(flower.stats.critRate_).toBe(7.8);
    expect(flower.stats.atk_).toBe(5.8);

    const circlet = result.items[1];
    expect(circlet.slot).toBe('circlet');
    expect(circlet.stats.critRate_).toBeCloseTo(4.2, 5);

    const weapon = result.items[2];
    expect(weapon.slot).toBe('weapon');
    expect(weapon.setId).toBeNull();
    expect(weapon.rarity).toBe(5);
    expect(weapon.level).toBe(90);
    expect(weapon.requires).toEqual({ wt_sword: 1 });
    expect(weapon.stats.weaponAtk).toBe(115);
  });

  it('respeta el nivel minimo', () => {
    const result = importGood(good, catalog, { minLevel: 20 });

    expect(result.artifacts).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.items[0].slot).toBe('flower');
  });

  it('respeta la rareza minima', () => {
    const result = importGood(good, catalog, { minRarity: 5 });

    expect(result.artifacts).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('puede omitir las armas', () => {
    const result = importGood(good, catalog, { includeWeapons: false });

    expect(result.weapons).toBe(0);
    expect(result.items).toHaveLength(2);
  });

  it('cuenta las armas desconocidas como descartadas', () => {
    const result = importGood({ artifacts: [], weapons: [{ key: 'nope', level: 1 }] }, catalog);

    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('rechaza un archivo que no es objeto', () => {
    expect(() => importGood(null, catalog)).toThrow(/not a JSON object/);
    expect(() => importGood('GOOD', catalog)).toThrow(/not a JSON object/);
  });
});

describe('mainStatValue', () => {
  it('devuelve el valor maximo en el ultimo nivel de cinco estrellas', () => {
    expect(mainStatValue('hp', 5, 20)).toBe(4780);
  });

  it('devuelve cero para una estadistica desconocida', () => {
    expect(mainStatValue('no_existe', 5, 20)).toBe(0);
  });
});
