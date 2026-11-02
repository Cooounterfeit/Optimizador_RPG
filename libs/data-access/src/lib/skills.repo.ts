import { SkillSelectionSchema, type SkillSelection } from '@zenith/shared-types';

import { db, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import type { SkillsRepository } from './ports.js';

const parseSelection = (selection: unknown): SkillSelection => {
  const result = SkillSelectionSchema.safeParse(selection);
  if (!result.success) {
    throw new DataAccessError('La seleccion de habilidades no es valida.', { cause: result.error });
  }
  for (const [node, rank] of Object.entries(result.data)) {
    if (!Number.isInteger(rank) || rank < 0) {
      throw new DataAccessError(`El rango de "${node}" debe ser un entero mayor o igual a cero.`);
    }
  }
  return result.data;
};

export function createSkillsRepository(database: ZenithDatabase = db): SkillsRepository {
  const table = database.skills;

  return {
    async load(gameId) {
      try {
        const row = await table.get(gameId);
        return row ? { ...row.selection } : {};
      } catch (error) {
        throw toDataError(error, 'leer las habilidades');
      }
    },

    async save(gameId, selection) {
      const parsed = parseSelection(selection);
      try {
        if (Object.keys(parsed).length === 0) {
          await table.delete(gameId);
          return;
        }
        await table.put({ gameId, selection: parsed });
      } catch (error) {
        throw toDataError(error, 'guardar las habilidades');
      }
    },
  };
}

export const skillsRepository = createSkillsRepository();
