import type { Item } from '@zenith/shared-types';
import { z } from 'zod';

import type { InventoryCatalog } from './catalog.js';
import { ascensionStep, type InventoryRules } from './rules.js';

/** Un stat de una entrada puede ser fijo o crecer con el nivel. */
export const EntryStatSchema = z
  .object({
    value: z.number().optional(),
    base: z.number().optional(),
    curve: z.string().optional(),
    percent: z.boolean().optional(),
    ascension: z.array(z.number()).optional(),
  })
  .refine((stat) => stat.value !== undefined || stat.base !== undefined, {
    message: 'An entry stat needs value or base.',
  });

export const InventoryEntrySchema = z.object({
  key: z.string(),
  name: z.string(),
  rarity: z.number(),
  type: z.string().nullable().optional(),
  slot: z.string().optional(),
  maxLevel: z.number(),
  stats: z.record(z.string(), EntryStatSchema).default({}),
  requires: z.record(z.string(), z.number()).optional(),
  iconKey: z.string().optional(),
});

export type InventoryEntry = z.infer<typeof InventoryEntrySchema>;

export interface EntrySummary {
  key: string;
  name: string;
  rarity: number;
  type: string | null;
  slot: string | null;
  maxLevel: number;
}

/** Catalogo completo, ordenado por nombre, para la pantalla de catalogo. */
export function listEntries(catalog: InventoryCatalog): EntrySummary[] {
  return catalog.entries
    .map((entry) => ({
      key: entry.key,
      name: entry.name,
      rarity: entry.rarity,
      type: entry.type ?? null,
      slot: entry.slot ?? null,
      maxLevel: entry.maxLevel,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Stats de una entrada a su nivel y ascension.
 *
 * Cada stat declara si es fijo (`value`) o si crece (`base` * curva). El bono
 * de ascension se toma del descriptor, no de un corte hardcodeado.
 */
export function entryStats(
  entry: InventoryEntry,
  curves: InventoryCatalog['curves'],
  level: number,
  ascension: number | undefined,
  rules: InventoryRules,
): Record<string, number> {
  const out: Record<string, number> = {};
  const lvl = Math.max(1, Math.min(level || 1, entry.maxLevel));
  const step = ascension ?? ascensionStep(lvl, rules.ascensionLevels);

  for (const [stat, definition] of Object.entries(entry.stats)) {
    if (definition.value !== undefined) {
      out[stat] = definition.value;
      continue;
    }

    const multiplier = definition.curve ? (curves[String(lvl)]?.[definition.curve] ?? 1) : 1;
    const ascensionValue = definition.ascension
      ? (definition.ascension[Math.max(0, Math.min(step, definition.ascension.length - 1))] ?? 0)
      : 0;
    const value =
      (definition.base ?? 0) * multiplier * (definition.percent ? 100 : 1) + ascensionValue;

    out[stat] = Math.round(value * 10) / 10;
  }

  return out;
}

export function entryStatsByKey(
  catalog: InventoryCatalog,
  rules: InventoryRules,
  key: string,
  level: number,
  ascension?: number,
): Record<string, number> {
  const entry = catalog.entries.find((candidate) => candidate.key === key);
  return entry ? entryStats(entry, catalog.curves, level, ascension, rules) : {};
}

/** Convierte una entrada del catalogo en una pieza del inventario. */
export function entryItem(
  catalog: InventoryCatalog,
  rules: InventoryRules,
  key: string,
  level: number,
  slot?: string,
  ascension?: number,
): Item | null {
  const entry = catalog.entries.find((candidate) => candidate.key === key);
  if (!entry) return null;

  const lvl = Math.max(1, Math.min(level || 1, entry.maxLevel));
  const stats = entryStats(entry, catalog.curves, lvl, ascension, rules);

  return {
    id: `entry-${key}-${lvl}`,
    slot: slot ?? entry.slot ?? rules.weaponSlot ?? 'item',
    setId: null,
    name: `${entry.name} · Lv. ${lvl}`,
    rarity: entry.rarity,
    level: lvl,
    stats,
    requires: entry.requires,
  };
}
