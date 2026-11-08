/**
 * Adaptador GOOD -> Zenith
 * ------------------------
 * GOOD es el formato abierto que exportan varias herramientas de la comunidad
 * gacha. El motor solo ve `Item[]`: otro formato es otro adaptador.
 *
 * Este modulo no conoce ningun juego: recibe el catalogo como parametro.
 */

import type { Item } from '@zenith/shared-types';

import type { GachaCatalog, GoodFile } from './types';
import { weaponStats } from './weapons';

/**
 * Valor de la estadistica principal segun rareza y nivel.
 * Interpola linealmente entre nivel 0 y el maximo de la rareza: es una
 * aproximacion, la tabla real no es perfectamente lineal.
 */
const MAIN_STAT: Record<string, { r5: [number, number]; r4: [number, number] }> = {
  hp: { r5: [717, 4780], r4: [645, 3571] },
  atk: { r5: [47, 311], r4: [42, 232] },
  hp_: { r5: [7.0, 46.6], r4: [6.3, 34.8] },
  atk_: { r5: [7.0, 46.6], r4: [6.3, 34.8] },
  def_: { r5: [8.7, 58.3], r4: [7.9, 43.5] },
  eleMas: { r5: [28, 187], r4: [25, 139] },
  enerRech_: { r5: [7.8, 51.8], r4: [7.0, 38.7] },
  critRate_: { r5: [4.7, 31.1], r4: [4.2, 23.2] },
  critDMG_: { r5: [9.3, 62.2], r4: [8.4, 46.4] },
  heal_: { r5: [5.4, 35.9], r4: [4.8, 26.8] },
  physical_dmg_: { r5: [8.7, 58.3], r4: [7.9, 43.5] },
};

const ELEMENTAL_DMG: [number, number] = [7.0, 46.6];
const ELEMENTS = ['pyro', 'hydro', 'electro', 'cryo', 'anemo', 'geo', 'dendro'];

const SLOT_NAMES: Record<string, string> = {
  flower: 'Flower',
  plume: 'Plume',
  sands: 'Sands',
  goblet: 'Goblet',
  circlet: 'Circlet',
};

export function mainStatValue(key: string, rarity: number, level: number): number {
  const maxLevel = rarity === 5 ? 20 : rarity === 4 ? 16 : 12;
  const ratio = Math.max(0, Math.min(1, level / maxLevel));

  let range: [number, number];
  if (ELEMENTS.some((element) => key === `${element}_dmg_`)) {
    range = ELEMENTAL_DMG;
  } else {
    const entry = MAIN_STAT[key];
    if (!entry) return 0;
    range = rarity >= 5 ? entry.r5 : entry.r4;
  }

  const [low, high] = range;
  const scale = rarity >= 5 ? 1 : rarity === 4 ? 1 : 0.75;
  return (low + (high - low) * ratio) * scale;
}

export interface ImportOptions {
  /** Descarta artefactos por debajo de este nivel. */
  minLevel?: number;
  /** Descarta artefactos por debajo de esta rareza. */
  minRarity?: number;
  /** Importar tambien las armas como piezas de la ranura de arma. */
  includeWeapons?: boolean;
  /** Id de la ranura de arma en la plantilla destino. */
  weaponSlot?: string;
}

export interface ImportResult {
  items: Item[];
  skipped: number;
  total: number;
  artifacts: number;
  weapons: number;
}

export function importGood(
  raw: unknown,
  catalog: GachaCatalog,
  options: ImportOptions = {},
): ImportResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('The GOOD file is not a JSON object.');
  }

  const file = raw as GoodFile;
  const artifacts = Array.isArray(file.artifacts) ? file.artifacts : [];
  const minLevel = options.minLevel ?? 0;
  const minRarity = options.minRarity ?? 0;

  const items: Item[] = [];
  let skipped = 0;

  artifacts.forEach((artifact, index) => {
    if (!artifact?.slotKey || !artifact.mainStatKey) {
      skipped++;
      return;
    }
    if ((artifact.level ?? 0) < minLevel || (artifact.rarity ?? 0) < minRarity) {
      skipped++;
      return;
    }

    const stats: Record<string, number> = {};
    const mainValue = mainStatValue(
      artifact.mainStatKey,
      artifact.rarity ?? 5,
      artifact.level ?? 0,
    );
    if (mainValue) {
      stats[artifact.mainStatKey] = (stats[artifact.mainStatKey] ?? 0) + mainValue;
    }

    for (const substat of artifact.substats ?? []) {
      if (!substat?.key || !substat.value) continue;
      stats[substat.key] = (stats[substat.key] ?? 0) + substat.value;
    }

    const slotName = SLOT_NAMES[artifact.slotKey] ?? artifact.slotKey;
    items.push({
      id: artifact.id ?? `art_${index}`,
      slot: artifact.slotKey,
      setId: artifact.setKey ?? null,
      name: `${slotName} +${artifact.level ?? 0} · ${artifact.mainStatKey}`,
      rarity: artifact.rarity,
      level: artifact.level,
      stats,
    });
  });

  const weaponSlot = options.weaponSlot ?? catalog.weaponSlot ?? 'weapon';
  const weapons =
    options.includeWeapons === false ? [] : Array.isArray(file.weapons) ? file.weapons : [];
  let importedWeapons = 0;

  weapons.forEach((entry, index) => {
    const weapon = catalog.weapons.find((candidate) => candidate.key === entry.key);
    if (!weapon) {
      skipped++;
      return;
    }
    if ((weapon.rarity ?? 0) < minRarity) {
      skipped++;
      return;
    }

    const level = entry.level ?? 1;
    const stats = weaponStats(weapon, catalog.curves, level, entry.ascension);
    if (!stats.weaponAtk) {
      skipped++;
      return;
    }

    items.push({
      id: entry.id ?? `weapon_${index}`,
      slot: weaponSlot,
      setId: null,
      name: `${weapon.name} · Lv. ${level}`,
      rarity: weapon.rarity,
      level,
      stats,
      requires: weapon.type ? { [`wt_${weapon.type}`]: 1 } : undefined,
    });
    importedWeapons++;
  });

  return {
    items,
    skipped,
    total: artifacts.length + weapons.length,
    artifacts: items.length - importedWeapons,
    weapons: importedWeapons,
  };
}
