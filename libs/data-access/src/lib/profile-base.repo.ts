import { db, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import type { ProfileBaseRepository } from './ports.js';

const assertBase = (base: Record<string, number>): void => {
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    throw new DataAccessError('La base del perfil debe ser un mapa de estadistica a numero.');
  }
  for (const [stat, value] of Object.entries(base)) {
    if (!Number.isFinite(value)) {
      throw new DataAccessError(`La estadistica "${stat}" no es un numero.`);
    }
  }
};

export function createProfileBaseRepository(
  database: ZenithDatabase = db,
): ProfileBaseRepository {
  const table = database.profile_base;

  return {
    async get(gameId, profileId) {
      try {
        const row = await table.get([gameId, profileId]);
        return row ? { ...row.base } : undefined;
      } catch (error) {
        throw toDataError(error, 'leer la base del perfil');
      }
    },

    async save(gameId, profileId, base) {
      assertBase(base);
      try {
        await table.put({ gameId, profileId, base: { ...base }, updatedAt: Date.now() });
      } catch (error) {
        throw toDataError(error, 'guardar la base del perfil');
      }
    },

    async removeProfile(gameId, profileId) {
      try {
        await table.delete([gameId, profileId]);
      } catch (error) {
        throw toDataError(error, 'borrar la base del perfil');
      }
    },

    async removeByGame(gameId) {
      try {
        await table.where('gameId').equals(gameId).delete();
      } catch (error) {
        throw toDataError(error, 'borrar las bases del juego');
      }
    },
  };
}

export const profileBaseRepository = createProfileBaseRepository();
