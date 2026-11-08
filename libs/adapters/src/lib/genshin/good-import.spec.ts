import { describe, expect, it } from 'vitest';

import { importGood, mainStatValue } from './good-import';

const good = {
  format: 'GOOD',
  artifacts: [
    {
      setKey: 'GladiatorsFinale',
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
      setKey: 'WanderersTroupe',
      rarity: 4,
      level: 0,
      slotKey: 'circlet',
      mainStatKey: 'critRate_',
      substats: [],
    },
  ],
  weapons: [
    { key: 'WolfsGravestone', level: 90, ascension: 6, refinement: 1 },
  ],
};

describe('importGood', () => {
  it('convierte artefactos y armas en piezas del inventario', () => {
    const result = importGood(good);

    expect(result.total).toBe(3);
    expect(result.artifacts).toBe(2);
    expect(result.weapons).toBe(1);
    expect(result.skipped).toBe(0);

    const flower = result.items[0];
    expect(flower.slot).toBe('flower');
    expect(flower.setId).toBe('GladiatorsFinale');
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
    expect(weapon.requires).toEqual({ wt_claymore: 1 });
    expect(weapon.stats.weaponAtk).toBeGreaterThan(500);
  });

  it('respeta el nivel minimo', () => {
    const result = importGood(good, { minLevel: 20 });

    expect(result.artifacts).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.items[0].slot).toBe('flower');
  });

  it('respeta la rareza minima', () => {
    const result = importGood(good, { minRarity: 5 });

    expect(result.artifacts).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('puede omitir las armas', () => {
    const result = importGood(good, { includeWeapons: false });

    expect(result.weapons).toBe(0);
    expect(result.items).toHaveLength(2);
  });

  it('cuenta las armas desconocidas como descartadas', () => {
    const result = importGood({
      artifacts: [],
      weapons: [{ key: 'ArmaQueNoExiste', level: 1 }],
    });

    expect(result.items).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('rechaza un archivo que no es objeto', () => {
    expect(() => importGood(null)).toThrow(/not a JSON object/);
    expect(() => importGood('GOOD')).toThrow(/not a JSON object/);
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
