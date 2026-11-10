import type { GameTemplate } from '@zenith/shared-types';
import { z } from 'zod';

export const LevelRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

export const InventoryLabelsSchema = z.object({
  entry: z.string().optional(),
  entries: z.string().optional(),
  sets: z.string().optional(),
  includeEntries: z.string().optional(),
});

export const MainStatCurveSchema = z.record(
  z.string(),
  z.array(z.tuple([z.number(), z.number()])),
);

/**
 * Reglas de inventario del juego. Todo lo que cambia entre juegos vive aqui:
 * ranuras, stats, rarezas, rangos de nivel, ascension y curvas de stat principal.
 */
export const InventoryRulesSchema = z.object({
  format: z.string().default('good'),
  weaponSlot: z.string().optional(),
  setIconSlot: z.string().optional(),
  slots: z.record(z.string(), z.string()).default({}),
  stats: z.record(z.string(), z.string()).default({}),
  rarities: z.array(z.number()),
  artifactLevelRange: LevelRangeSchema,
  itemLevelRange: LevelRangeSchema,
  ascensionLevels: z.array(z.number()).default([]),
  mainStats: z.record(z.string(), MainStatCurveSchema).default({}),
  labels: InventoryLabelsSchema.default({}),
  nameTemplate: z.string().optional(),
});

export type InventoryRules = z.infer<typeof InventoryRulesSchema>;

export const InventoryPointerSchema = z.object({
  kind: z.literal('inventory'),
  catalogUrl: z.string().min(1),
  catalogVersion: z.string().optional(),
  rules: InventoryRulesSchema,
});

export type InventoryPointer = z.infer<typeof InventoryPointerSchema>;

/** Lee el puntero y las reglas desde `template.extensions.inventory`. */
export function inventoryPointer(template: GameTemplate): InventoryPointer | null {
  const parsed = InventoryPointerSchema.safeParse(template.extensions?.inventory);
  return parsed.success ? parsed.data : null;
}

/** Devuelve solo las reglas, o `null` si el juego no declara inventario. */
export function inventoryRules(template: GameTemplate): InventoryRules | null {
  return inventoryPointer(template)?.rules ?? null;
}

export function mapSlot(rules: InventoryRules, key: string): string {
  return rules.slots[key] ?? key;
}

export function mapStat(rules: InventoryRules, key: string): string {
  return rules.stats[key] ?? key;
}

/** Cantidad de cortes de ascension superados por el nivel. */
export function ascensionStep(level: number, thresholds: number[]): number {
  return thresholds.filter((threshold) => level > threshold).length;
}

/**
 * Valor de una estadistica principal para una rareza y nivel.
 *
 * Los puntos vienen del juego. Entre dos puntos se interpola en linea recta y
 * fuera del rango se queda en el extremo.
 */
export function mainStatValue(
  rules: InventoryRules,
  key: string,
  rarity: number,
  level: number,
): number {
  const points = rules.mainStats[key]?.[String(rarity)];
  if (!points || points.length === 0) return 0;

  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (level <= first[0]) return first[1];
  if (level >= last[0]) return last[1];

  for (let index = 1; index < sorted.length; index++) {
    const [x1, y1] = sorted[index - 1];
    const [x2, y2] = sorted[index];
    if (level <= x2) {
      const ratio = x2 === x1 ? 0 : (level - x1) / (x2 - x1);
      return y1 + (y2 - y1) * ratio;
    }
  }

  return last[1];
}
