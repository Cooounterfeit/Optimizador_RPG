import { describe, expect, it } from 'vitest';

import type { GachaCatalog } from './types';
import { goodKey, listWeapons, weaponItem, weaponStatsByKey } from './weapons';

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
    {
      key: 'iron-wand',
      name: 'Iron Wand',
      rarity: 4,
      type: 'catalyst',
      maxLevel: 90,
      atk: 400,
      sub: { stat: 'atk', value: 20 },
    },
  ],
  curves: { '1': { growth: 1 }, '90': { growth: 2.5 } },
};

describe('listWeapons', () => {
  it('devuelve el catalogo ordenado por nombre', () => {
    const weapons = listWeapons(catalog);

    expect(weapons.map((weapon) => weapon.key)).toEqual(['iron-wand', 'starlight-blade']);
    expect(weapons[1]).toMatchObject({ rarity: 5, type: 'sword', maxLevel: 90 });
  });
});

describe('weaponStatsByKey', () => {
  it('escala el ataque con el nivel', () => {
    const level1 = weaponStatsByKey(catalog, 'starlight-blade', 1);
    const level90 = weaponStatsByKey(catalog, 'starlight-blade', 90);

    expect(level1.weaponAtk).toBe(46);
    expect(level90.weaponAtk).toBe(115);
    expect(level90.critRate_).toBe(18);
  });

  it('usa el ataque fijo cuando el arma no tiene curvas', () => {
    expect(weaponStatsByKey(catalog, 'iron-wand', 90)).toEqual({ weaponAtk: 400, atk: 20 });
  });

  it('devuelve vacio para un arma desconocida', () => {
    expect(weaponStatsByKey(catalog, 'nope', 90)).toEqual({});
  });
});

describe('weaponItem', () => {
  it('arma la pieza del inventario con su ranura y requisito', () => {
    const item = weaponItem(catalog, 'starlight-blade', 90);

    expect(item).not.toBeNull();
    expect(item?.slot).toBe('weapon');
    expect(item?.name).toBe('Starlight Blade · Lv. 90');
    expect(item?.rarity).toBe(5);
    expect(item?.requires).toEqual({ wt_sword: 1 });
  });

  it('devuelve null si el arma no existe', () => {
    expect(weaponItem(catalog, 'nope', 90)).toBeNull();
  });
});

describe('goodKey', () => {
  it('convierte nombres a claves GOOD', () => {
    expect(goodKey("Wolf's Gravestone")).toBe('WolfsGravestone');
    expect(goodKey('Kamisato Ayaka')).toBe('KamisatoAyaka');
  });
});
