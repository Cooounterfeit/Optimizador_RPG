import { ItemSchema, type Item } from '@zenith/shared-types';

import { db, type InventoryRow, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import { createEmitter } from './events.js';
import type { InventoryRepository } from './ports.js';
import { normalizeKey } from './text.js';

const changes = createEmitter<string>();

/** Avisa que el inventario de un juego cambio. */
export const onInventoryChanged = changes.subscribe;

const parseItem = (item: unknown): Item => {
  const result = ItemSchema.safeParse(item);
  if (!result.success) {
    throw new DataAccessError('El objeto no tiene un formato valido.', { cause: result.error });
  }
  return result.data;
};

const toItem = (row: InventoryRow): Item => ({
  id: row.id,
  slot: row.slot,
  slots: row.slots,
  setId: row.setId,
  name: row.name,
  rarity: row.rarity,
  level: row.level,
  stats: row.stats,
  requires: row.requires,
  exclusiveGroup: row.exclusiveGroup,
});

export function createInventoryRepository(database: ZenithDatabase = db): InventoryRepository {
  const table = database.local_inventory;

  return {
    async addItem(item, gameId) {
      const parsed = parseItem(item);
      try {
        const exists = await table.get(parsed.id);
        if (exists) throw new DataAccessError(`Ya existe un objeto con el id "${parsed.id}".`);
        await table.put({ ...parsed, gameId, updatedAt: Date.now() });
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'guardar el objeto');
      }
    },

    async getAll(gameId) {
      try {
        const rows = gameId ? await table.where('gameId').equals(gameId).toArray() : await table.toArray();
        return rows.sort((a, b) => a.name.localeCompare(b.name)).map(toItem);
      } catch (error) {
        throw toDataError(error, 'leer el inventario');
      }
    },

    async getById(id) {
      try {
        const row = await table.get(id);
        return row ? toItem(row) : undefined;
      } catch (error) {
        throw toDataError(error, 'leer el objeto');
      }
    },

    async updateItem(item, gameId) {
      const parsed = parseItem(item);
      try {
        const exists = await table.get(parsed.id);
        if (!exists) throw new DataAccessError(`No existe un objeto con el id "${parsed.id}".`);
        await table.put({ ...parsed, gameId, updatedAt: Date.now() });
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'actualizar el objeto');
      }
    },

    async removeItem(id) {
      try {
        const row = await table.get(id);
        if (!row) return;
        await table.delete(id);
        changes.emit(row.gameId);
      } catch (error) {
        throw toDataError(error, 'eliminar el objeto');
      }
    },

    async searchItems(query, gameId) {
      const needle = normalizeKey(query);
      try {
        const rows = gameId ? await table.where('gameId').equals(gameId).toArray() : await table.toArray();
        if (!needle) return rows.sort((a, b) => a.name.localeCompare(b.name)).map(toItem);
        return rows
          .filter((row) => normalizeKey(row.name).includes(needle))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(toItem);
      } catch (error) {
        throw toDataError(error, 'buscar objetos');
      }
    },

    async removeByGame(gameId) {
      try {
        await table.where('gameId').equals(gameId).delete();
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'borrar el inventario del juego');
      }
    },
  };
}

/** Repositorio de la app. */
export const inventoryRepository = createInventoryRepository();
