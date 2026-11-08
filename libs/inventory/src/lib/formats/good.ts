/**
 * Formato GOOD
 * ------------
 * GOOD es un formato de archivo, no un genero. Este modulo solo sabe leer su
 * forma (`artifacts`, `weapons`, `mainStatKey`, `substats`); las reglas del
 * juego llegan en la plantilla y las entradas en el catalogo.
 */

import type { GameTemplate, Item } from '@zenith/shared-types';

import type { InventoryCatalog } from '../catalog.js';
import { entryItem } from '../entries.js';
import {
  mainStatValue,
  mapSlot,
  mapStat,
  inventoryRules,
  type InventoryRules,
} from '../rules.js';

export interface GoodSubstat {
  key: string;
  value: number;
}

export interface GoodArtifact {
  setKey: string;
  rarity: number;
  level: number;
  slotKey: string;
  mainStatKey: string;
  substats: GoodSubstat[];
  id?: string;
  location?: string;
}

export interface GoodWeapon {
  key: string;
  level?: number;
  ascension?: number;
  refinement?: number;
  location?: string;
  id?: string;
}

export interface GoodFile {
  format?: string;
  artifacts?: GoodArtifact[];
  weapons?: GoodWeapon[];
}

export interface ImportOptions {
  /** Descarta artefactos por debajo de este nivel. */
  minLevel?: number;
  /** Descarta artefactos y entradas por debajo de esta rareza. */
  minRarity?: number;
  /** Importar tambien las entradas del catalogo. */
  includeEntries?: boolean;
  /** Ranura destino de las entradas; si falta, se usa la de la entrada. */
  entrySlot?: string;
}

export interface ImportResult {
  items: Item[];
  skipped: number;
  total: number;
  artifacts: number;
  entries: number;
}

const nameOf = (
  rules: InventoryRules,
  template: GameTemplate,
  slotId: string,
  level: number,
  statId: string,
  originalSlot: string,
  originalStat: string,
): string => {
  const slotName = template.slots.find((slot) => slot.id === slotId)?.name ?? slotId;
  const statName = template.stats.find((stat) => stat.id === statId)?.name ?? statId;
  const pattern = rules.nameTemplate ?? '{slot} +{level} · {stat}';

  return pattern
    .replaceAll('{slot}', slotName)
    .replaceAll('{level}', String(level))
    .replaceAll('{stat}', statName)
    .replaceAll('{statKey}', originalStat)
    .replaceAll('{slotKey}', originalSlot);
};

export function importGood(
  raw: unknown,
  template: GameTemplate,
  catalog: InventoryCatalog,
  options: ImportOptions = {},
): ImportResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('The GOOD file is not a JSON object.');
  }

  const rules = inventoryRules(template);
  if (!rules) {
    throw new Error('The game does not declare inventory rules.');
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

    const slot = mapSlot(rules, artifact.slotKey);
    const mainStat = mapStat(rules, artifact.mainStatKey);
    const level = artifact.level ?? 0;
    const rarity = artifact.rarity ?? 5;
    const stats: Record<string, number> = {};

    const mainValue = mainStatValue(rules, artifact.mainStatKey, rarity, level);
    if (mainValue) {
      stats[mainStat] = (stats[mainStat] ?? 0) + mainValue;
    }

    for (const substat of artifact.substats ?? []) {
      if (!substat?.key || !substat.value) continue;
      const stat = mapStat(rules, substat.key);
      stats[stat] = (stats[stat] ?? 0) + substat.value;
    }

    items.push({
      id: artifact.id ?? `art_${index}`,
      slot,
      setId: artifact.setKey ?? null,
      name: nameOf(
        rules,
        template,
        slot,
        level,
        mainStat,
        artifact.slotKey,
        artifact.mainStatKey,
      ),
      rarity: artifact.rarity,
      level: artifact.level,
      stats,
    });
  });

  const entrySlot = options.entrySlot ?? rules.weaponSlot;
  const entries =
    options.includeEntries === false ? [] : Array.isArray(file.weapons) ? file.weapons : [];
  let importedEntries = 0;

  entries.forEach((source, index) => {
    const entry = catalog.entries.find((candidate) => candidate.key === source.key);
    if (!entry) {
      skipped++;
      return;
    }
    if ((entry.rarity ?? 0) < minRarity) {
      skipped++;
      return;
    }

    const level = source.level ?? 1;
    const item = entryItem(catalog, rules, entry.key, level, entrySlot, source.ascension);
    if (!item) {
      skipped++;
      return;
    }

    items.push({
      ...item,
      id: source.id ?? `entry_${index}`,
    });
    importedEntries++;
  });

  return {
    items,
    skipped,
    total: artifacts.length + entries.length,
    artifacts: items.length - importedEntries,
    entries: importedEntries,
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
