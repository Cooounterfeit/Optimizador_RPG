import { GameTemplateSchema } from '@zenith/shared-types';

import { db, type GameRow, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import { createEmitter } from './events.js';
import type { GameInput, GameRepository } from './ports.js';

const changes = createEmitter<string>();

/** Avisa que un juego se guardo o se borro. */
export const onGamesChanged = changes.subscribe;

const parseTemplate = (input: GameInput): GameRow => {
  const result = GameTemplateSchema.safeParse(input.template);
  if (!result.success) {
    throw new DataAccessError('La plantilla del juego no es valida.', { cause: result.error });
  }
  if (result.data.gameId !== input.id) {
    throw new DataAccessError(
      `El id del juego ("${input.id}") no coincide con el de la plantilla ("${result.data.gameId}").`,
    );
  }
  return {
    id: input.id,
    template: result.data,
    updatedAt: Date.now(),
    forkedFrom: input.forkedFrom,
    cloud: input.cloud,
    syncedAt: input.syncedAt,
  };
};

export function createGameRepository(database: ZenithDatabase = db): GameRepository {
  const table = database.games;

  return {
    async list() {
      try {
        const rows = await table.toArray();
        return rows.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (error) {
        throw toDataError(error, 'leer los juegos');
      }
    },

    async get(id) {
      try {
        return await table.get(id);
      } catch (error) {
        throw toDataError(error, 'leer el juego');
      }
    },

    async save(game) {
      const row = parseTemplate(game);
      try {
        const previous = await table.get(row.id);
        const merged: GameRow = {
          ...row,
          forkedFrom: row.forkedFrom ?? previous?.forkedFrom,
          cloud: row.cloud ?? previous?.cloud,
          syncedAt: row.syncedAt ?? previous?.syncedAt,
        };
        await table.put(merged);
        changes.emit(merged.id);
        return merged;
      } catch (error) {
        throw toDataError(error, 'guardar el juego');
      }
    },

    async remove(id) {
      try {
        await database.transaction(
          'rw',
          [
            database.games,
            database.local_inventory,
            database.equipment,
            database.level_history,
            database.skills,
            database.images,
          ],
          async () => {
            await database.games.delete(id);
            await database.local_inventory.where('gameId').equals(id).delete();
            await database.equipment.where('gameId').equals(id).delete();
            await database.level_history.where('gameId').equals(id).delete();
            await database.skills.delete(id);
            await database.images.where('gameId').equals(id).delete();
          },
        );
        changes.emit(id);
      } catch (error) {
        throw toDataError(error, 'borrar el juego');
      }
    },
  };
}

export const gameRepository = createGameRepository();
