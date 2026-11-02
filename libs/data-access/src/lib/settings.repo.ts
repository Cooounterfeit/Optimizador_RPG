import { db, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import type { SettingsRepository } from './ports.js';

/** Claves conocidas y su validador. Una clave nueva se agrega aca. */
const validators: Record<string, (value: unknown) => boolean> = {
  advancedMode: (value) => typeof value === 'boolean',
  lastGameId: (value) => typeof value === 'string' && value.length > 0,
};

export type SettingKey = keyof typeof validators;

export function createSettingsRepository(database: ZenithDatabase = db): SettingsRepository {
  const table = database.local_settings;

  return {
    async get<T = unknown>(key: string) {
      try {
        const row = await table.get(key);
        if (row === undefined) return undefined;
        const validate = validators[key];
        if (validate && !validate(row.value)) return undefined;
        return row.value as T;
      } catch (error) {
        throw toDataError(error, 'leer la preferencia');
      }
    },

    async set(key, value) {
      const validate = validators[key];
      if (!validate) throw new DataAccessError(`La preferencia "${key}" no existe.`);
      if (!validate(value)) throw new DataAccessError(`Valor invalido para "${key}".`);
      try {
        await table.put({ key, value });
      } catch (error) {
        throw toDataError(error, 'guardar la preferencia');
      }
    },

    async remove(key) {
      try {
        await table.delete(key);
      } catch (error) {
        throw toDataError(error, 'borrar la preferencia');
      }
    },
  };
}

export const settingsRepository = createSettingsRepository();
