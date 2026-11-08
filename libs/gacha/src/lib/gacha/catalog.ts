import type { GameTemplate } from '@zenith/shared-types';
import { z } from 'zod';

import type { GachaCatalog, GachaPointer } from './types';

export const GachaWeaponSchema = z.object({
  key: z.string(),
  name: z.string(),
  rarity: z.number(),
  type: z.string().nullable(),
  maxLevel: z.number(),
  atk: z.number().optional(),
  sub: z.object({ stat: z.string(), value: z.number() }).nullable().optional(),
  init: z.object({ v: z.number(), c: z.string() }).nullable().optional(),
  subInit: z
    .object({ stat: z.string(), v: z.number(), c: z.string(), pct: z.boolean() })
    .nullable()
    .optional(),
  ascAtk: z.array(z.number()).optional(),
});

export const GachaCatalogSchema = z.object({
  kind: z.literal('gacha'),
  weaponSlot: z.string().optional(),
  weapons: z.array(GachaWeaponSchema),
  curves: z.record(z.string(), z.record(z.string(), z.number())),
});

export const GachaPointerSchema = z.object({
  kind: z.literal('gacha'),
  catalogUrl: z.string().min(1),
  catalogVersion: z.string().optional(),
  weaponSlot: z.string().optional(),
});

/**
 * Lee el puntero del catalogo desde la plantilla. Devuelve `null` si el juego
 * no es gacha o si el bloque esta mal formado.
 */
export function gachaPointer(template: GameTemplate): GachaPointer | null {
  const parsed = GachaPointerSchema.safeParse(template.extensions?.gacha);
  return parsed.success ? parsed.data : null;
}

const cache = new Map<string, Promise<GachaCatalog>>();

/** Limpia la cache en memoria (tests y cambios de version). */
export function clearGachaCatalogCache(): void {
  cache.clear();
}

/**
 * Descarga y valida el catalogo apuntado por la plantilla.
 *
 * Cachea por URL: el nombre incluye la version, asi que una URL nueva evita
 * servir datos viejos. Si la descarga falla, se olvida para permitir reintento.
 */
export function loadGachaCatalog(
  pointer: GachaPointer,
  fetcher: typeof fetch = fetch,
): Promise<GachaCatalog> {
  const cached = cache.get(pointer.catalogUrl);
  if (cached) return cached;

  const pending = (async () => {
    const response = await fetcher(pointer.catalogUrl);
    if (!response.ok) {
      throw new Error(`The gacha catalog is not available (${response.status}).`);
    }

    const parsed = GachaCatalogSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error('The gacha catalog is not valid.');
    }

    return parsed.data;
  })();

  cache.set(pointer.catalogUrl, pending);
  pending.catch(() => cache.delete(pointer.catalogUrl));
  return pending;
}
