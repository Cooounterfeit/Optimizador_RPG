import { GameTemplateSchema, ItemSchema, type GameTemplate, type Item } from '@zenith/shared-types';

import { DataAccessError } from './errors.js';
import { imagesForItems } from './images.repo.js';
import type { GameRepository, ImageMap, ImagesRepository, InventoryRepository } from './ports.js';
import { freeId } from './text.js';

/** Paquete estandar de intercambio: es lo que se exporta y lo que se importa. */
export interface GamePackage {
  zenith: '0.1';
  exportedAt: string;
  template: GameTemplate;
  items: Item[];
  images?: ImageMap;
}

export interface PackageDeps {
  games: GameRepository;
  inventory: InventoryRepository;
  images: ImagesRepository;
}

export function makePackage(
  template: GameTemplate,
  items: Item[],
  images?: ImageMap,
): GamePackage {
  const pkg: GamePackage = {
    zenith: '0.1',
    exportedAt: new Date().toISOString(),
    template,
    items,
  };
  if (images && Object.keys(images).length > 0) pkg.images = images;
  return pkg;
}

/** Valida el paquete que llega de fuera. Nada entra a la base sin pasar por aca. */
export function parsePackage(raw: unknown): GamePackage {
  if (typeof raw !== 'object' || raw === null) {
    throw new DataAccessError('El paquete no es un objeto.');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.zenith !== '0.1') {
    throw new DataAccessError('El paquete no es de Zenith (version 0.1).');
  }
  const template = GameTemplateSchema.safeParse(obj.template);
  if (!template.success) {
    throw new DataAccessError('La plantilla del paquete no es valida.', { cause: template.error });
  }
  if (!Array.isArray(obj.items)) {
    throw new DataAccessError('El paquete no trae una lista de objetos.');
  }
  const items: Item[] = obj.items.map((item, index) => {
    const parsed = ItemSchema.safeParse(item);
    if (!parsed.success) {
      throw new DataAccessError(`El objeto ${index + 1} del paquete no es valido.`, {
        cause: parsed.error,
      });
    }
    return parsed.data;
  });
  const pkg: GamePackage = {
    zenith: '0.1',
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    template: template.data,
    items,
  };
  if (obj.images !== undefined) {
    if (typeof obj.images !== 'object' || obj.images === null || Array.isArray(obj.images)) {
      throw new DataAccessError('Las imagenes del paquete no son validas.');
    }
    pkg.images = obj.images as ImageMap;
  }
  return pkg;
}

/** Junta juego, objetos e imagenes de un juego en un paquete exportable. */
export async function exportGame(gameId: string, deps: PackageDeps): Promise<GamePackage> {
  const game = await deps.games.get(gameId);
  if (!game) throw new DataAccessError(`No existe el juego "${gameId}".`);
  const items = await deps.inventory.getAll(gameId);
  const images = await deps.images.get(gameId);
  return makePackage(game.template, items, imagesForItems(images, items));
}

/**
 * Guarda un paquete como un juego nuevo. Si el id ya esta usado se busca otro
 * libre; los objetos con id repetido se renombran para no pisar el inventario
 * existente.
 */
export async function importGame(
  raw: unknown,
  deps: PackageDeps,
  options: { id?: string } = {},
): Promise<{ id: string; items: number; images: number }> {
  const pkg = parsePackage(raw);
  const games = await deps.games.list();
  const id = options.id ?? freeId(pkg.template.name || 'juego', new Set(games.map((g) => g.id)));
  if (games.some((game) => game.id === id)) {
    throw new DataAccessError(`Ya existe un juego con el id "${id}".`);
  }

  await deps.games.save({ id, template: { ...pkg.template, gameId: id }, forkedFrom: pkg.template.gameId });

  const used = new Set((await deps.inventory.getAll()).map((item) => item.id));
  for (const item of pkg.items) {
    const itemId = used.has(item.id) ? freeId(`${item.id}-2`, used) : item.id;
    used.add(itemId);
    await deps.inventory.addItem({ ...item, id: itemId }, id);
  }

  const images = await deps.images.import(id, pkg.images ?? {});
  return { id, items: pkg.items.length, images };
}
