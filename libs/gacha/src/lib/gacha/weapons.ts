import type { Item } from '@zenith/shared-types';

import type { GachaCatalog, GachaWeapon, WeaponSummary } from './types';

/** Catalogo completo, ordenado por nombre, para la pantalla de catalogo. */
export function listWeapons(catalog: GachaCatalog): WeaponSummary[] {
  return catalog.weapons
    .map((weapon) => ({
      key: weapon.key,
      name: weapon.name,
      rarity: weapon.rarity,
      type: weapon.type,
      maxLevel: weapon.maxLevel,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Escalon de ascension que corresponde a un nivel. Sirve cuando el archivo no
 * lo declara (el catalogo solo pide nivel): sin esto, un arma a 90 quedaria con
 * el ataque de una recien obtenida.
 */
export function ascensionForLevel(level: number): number {
  if (level <= 20) return 0;
  if (level <= 40) return 1;
  if (level <= 50) return 2;
  if (level <= 60) return 3;
  if (level <= 70) return 4;
  if (level <= 80) return 5;
  return 6;
}

/**
 * ATQ base y subestadistica de un arma a su nivel y ascension reales.
 *
 * Usa las curvas de crecimiento del catalogo: un arma a nivel 1 y la misma a
 * nivel 90 no se parecen en nada.
 */
export function weaponStats(
  weapon: GachaWeapon,
  curves: GachaCatalog['curves'],
  level: number,
  ascension?: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  const lvl = Math.max(1, Math.min(level || 1, weapon.maxLevel));
  const curve = (name: string) => curves[String(lvl)]?.[name] ?? 1;

  if (weapon.init) {
    const step = Math.max(
      0,
      Math.min(ascension ?? ascensionForLevel(lvl), (weapon.ascAtk?.length ?? 1) - 1),
    );
    const asc = weapon.ascAtk?.[step] ?? 0;
    out.weaponAtk = Math.round((weapon.init.v * curve(weapon.init.c) + asc) * 10) / 10;
  } else if (weapon.atk) {
    out.weaponAtk = weapon.atk;
  }

  if (weapon.subInit) {
    const value = weapon.subInit.v * curve(weapon.subInit.c) * (weapon.subInit.pct ? 100 : 1);
    out[weapon.subInit.stat] = Math.round(value * 10) / 10;
  } else if (weapon.sub) {
    out[weapon.sub.stat] = weapon.sub.value;
  }

  return out;
}

export function weaponStatsByKey(
  catalog: GachaCatalog,
  key: string,
  level: number,
  ascension?: number,
): Record<string, number> {
  const weapon = catalog.weapons.find((entry) => entry.key === key);
  return weapon ? weaponStats(weapon, catalog.curves, level, ascension) : {};
}

/**
 * Convierte un arma del catalogo en una pieza del inventario.
 * Devuelve `null` si la clave no existe en el catalogo.
 */
export function weaponItem(
  catalog: GachaCatalog,
  key: string,
  level: number,
  slot = 'weapon',
): Item | null {
  const weapon = catalog.weapons.find((entry) => entry.key === key);
  if (!weapon) return null;

  const lvl = Math.max(1, Math.min(level || 1, weapon.maxLevel));
  const stats = weaponStats(weapon, catalog.curves, lvl);
  if (stats.weaponAtk === undefined) return null;

  return {
    id: `weapon-${key}-${lvl}`,
    slot,
    setId: null,
    name: `${weapon.name} · Lv. ${lvl}`,
    rarity: weapon.rarity,
    level: lvl,
    stats,
    requires: weapon.type ? { [`wt_${weapon.type}`]: 1 } : undefined,
  };
}

/** Clave GOOD a partir de un nombre: "Wolf's Gravestone" -> "WolfsGravestone". */
export function goodKey(name: string): string {
  return name
    .replace(/['’]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
}
