import { db, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import type { LevelHistoryRepository, LevelSnapshot } from './ports.js';

const toSnapshot = (row: { level: number; base: Record<string, number>; at: string }): LevelSnapshot => ({
  level: row.level,
  base: { ...row.base },
  at: row.at,
});

export function createLevelHistoryRepository(
  database: ZenithDatabase = db,
): LevelHistoryRepository {
  const table = database.level_history;

  const list = async (gameId: string, profileId: string): Promise<LevelSnapshot[]> => {
    const rows = await table.where('gameId').equals(gameId).toArray();
    return rows
      .filter((row) => row.profileId === profileId)
      .sort((a, b) => a.level - b.level)
      .map(toSnapshot);
  };

  return {
    async list(gameId, profileId) {
      try {
        return await list(gameId, profileId);
      } catch (error) {
        throw toDataError(error, 'leer el historial de niveles');
      }
    },

    async recordLevel(gameId, profileId, level, base) {
      if (!Number.isInteger(level) || level < 0) {
        throw new DataAccessError('El nivel debe ser un entero mayor o igual a cero.');
      }
      for (const [stat, value] of Object.entries(base)) {
        if (!Number.isFinite(value)) {
          throw new DataAccessError(`La estadistica "${stat}" no es un numero.`);
        }
      }
      try {
        await table.put({ gameId, profileId, level, base: { ...base }, at: new Date().toISOString() });
        return await list(gameId, profileId);
      } catch (error) {
        throw toDataError(error, 'registrar el nivel');
      }
    },

    async removeLevel(gameId, profileId, level) {
      try {
        await table.delete([gameId, profileId, level]);
        return await list(gameId, profileId);
      } catch (error) {
        throw toDataError(error, 'eliminar el nivel');
      }
    },

    async clear(gameId, profileId) {
      try {
        const rows = await table.where('gameId').equals(gameId).toArray();
        const keys = rows
          .filter((row) => row.profileId === profileId)
          .map((row) => [row.gameId, row.profileId, row.level] as [string, string, number]);
        await table.bulkDelete(keys);
      } catch (error) {
        throw toDataError(error, 'limpiar el historial');
      }
    },
  };
}

export const levelHistoryRepository = createLevelHistoryRepository();
