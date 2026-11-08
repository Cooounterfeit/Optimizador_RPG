import { describe, expect, it } from 'vitest';

import { goodKey, listWeapons, weaponItem, weaponStatsByKey } from './weapons';

describe('listWeapons', () => {
  it('devuelve el catalogo completo ordenado por nombre', () => {
    const weapons = listWeapons();

    expect(weapons.length).toBeGreaterThan(200);
    expect(weapons.some((weapon) => weapon.key === 'WolfsGravestone')).toBe(true);

    const names = weapons.map((weapon) => weapon.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });
});

describe('weaponStatsByKey', () => {
  it('escala el ataque con el nivel', () => {
    const level1 = weaponStatsByKey('WolfsGravestone', 1);
    const level90 = weaponStatsByKey('WolfsGravestone', 90);

    expect(level1.weaponAtk).toBeGreaterThan(0);
    expect(level90.weaponAtk).toBeGreaterThan(level1.weaponAtk ?? 0);
    expect(level90.weaponAtk).toBeCloseTo(608, 0);
  });

  it('devuelve vacio para un arma desconocida', () => {
    expect(weaponStatsByKey('Nope', 90)).toEqual({});
  });
});

describe('weaponItem', () => {
  it('arma la pieza del inventario con su ranura y requisito', () => {
    const item = weaponItem('WolfsGravestone', 90);

    expect(item).not.toBeNull();
    expect(item?.slot).toBe('weapon');
    expect(item?.name).toBe("Wolf's Gravestone · Lv. 90");
    expect(item?.rarity).toBe(5);
    expect(item?.requires).toEqual({ wt_claymore: 1 });
  });

  it('devuelve null si el arma no existe', () => {
    expect(weaponItem('Nope', 90)).toBeNull();
  });
});

describe('goodKey', () => {
  it('convierte nombres a claves GOOD', () => {
    expect(goodKey("Wolf's Gravestone")).toBe('WolfsGravestone');
    expect(goodKey('Kamisato Ayaka')).toBe('KamisatoAyaka');
  });
});
