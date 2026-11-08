import { z } from 'zod';

import { InventoryEntrySchema } from './entries.js';
import type { InventoryPointer } from './rules.js';

export const InventoryCatalogSchema = z.object({
  kind: z.literal('inventory'),
  entries: z.array(InventoryEntrySchema),
  curves: z.record(z.string(), z.record(z.string(), z.number())).default({}),
});

export type InventoryCatalog = z.infer<typeof InventoryCatalogSchema>;

const cache = new Map<string, Promise<InventoryCatalog>>();

/** Limpia la cache en memoria (tests y cambios de version). */
export function clearInventoryCatalogCache(): void {
  cache.clear();
}

/**
 * Descarga y valida el catalogo apuntado por la plantilla.
 *
 * Cachea por URL: el nombre incluye la version, asi que una URL nueva evita
 * servir datos viejos. Si la descarga falla, se olvida para permitir reintento.
 */
export function loadInventoryCatalog(
  pointer: InventoryPointer,
  fetcher: typeof fetch = fetch,
): Promise<InventoryCatalog> {
  const cached = cache.get(pointer.catalogUrl);
  if (cached) return cached;

  const pending = (async () => {
    const response = await fetcher(pointer.catalogUrl);
    if (!response.ok) {
      throw new Error(`The inventory catalog is not available (${response.status}).`);
    }

    const parsed = InventoryCatalogSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error('The inventory catalog is not valid.');
    }

    return parsed.data;
  })();

  cache.set(pointer.catalogUrl, pending);
  pending.catch(() => cache.delete(pointer.catalogUrl));
  return pending;
}
