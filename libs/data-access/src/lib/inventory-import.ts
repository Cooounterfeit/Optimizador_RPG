import { ItemSchema, type Item } from '@zenith/shared-types';

import { DataAccessError } from './errors.js';
import { parsePackage, type PackageDeps } from './package.js';
import { freeId } from './text.js';

export type ImportMode = 'merge' | 'replace';

/**
 * Agrega piezas al inventario de un juego. En `merge` los ids repetidos se
 * renombran para no pisar lo que ya existe; en `replace` se vacia antes el
 * inventario de ese juego (solo de ese).
 */
export async function addItems(
  items: Item[],
  gameId: string,
  deps: Pick<PackageDeps, 'inventory'>,
  mode: ImportMode = 'merge',
): Promise<{ added: number }> {
  if (mode === 'replace') await deps.inventory.removeByGame(gameId);

  const used = new Set((await deps.inventory.getAll()).map((item) => item.id));
  let added = 0;

  for (const item of items) {
    const parsed = ItemSchema.safeParse(item);
    if (!parsed.success) {
      throw new DataAccessError(
        `El objeto "${item?.name ?? 'sin nombre'}" no es valido.`,
        { cause: parsed.error },
      );
    }

    const id = used.has(parsed.data.id)
      ? freeId(`${parsed.data.id}-2`, used)
      : parsed.data.id;
    used.add(id);

    await deps.inventory.addItem({ ...parsed.data, id }, gameId);
    added++;
  }

  return { added };
}

/**
 * Importa un paquete Zenith al juego que ya se esta usando. No crea un juego
 * nuevo (para eso esta `importGame`): la plantilla del paquete solo tiene que
 * coincidir con el juego destino.
 */
export async function importInventory(
  raw: unknown,
  gameId: string,
  deps: PackageDeps,
  options: { mode?: ImportMode } = {},
): Promise<{ items: number; images: number }> {
  const pkg = parsePackage(raw);

  if (pkg.template.gameId !== gameId) {
    throw new DataAccessError(
      `El paquete es de "${pkg.template.gameId}" y no de "${gameId}".`,
    );
  }

  const { added } = await addItems(pkg.items, gameId, deps, options.mode ?? 'merge');
  const images = await deps.images.import(gameId, pkg.images ?? {});

  return { items: added, images };
}
