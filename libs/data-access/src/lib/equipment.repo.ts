import type { Equipment } from '@zenith/shared-types';

import { db, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import { createEmitter } from './events.js';
import type { EquipmentRepository } from './ports.js';

const changes = createEmitter<string>();

/** Avisa que cambio el equipo de un juego (cualquier perfil). */
export const onEquipmentChanged = changes.subscribe;

const assertSlots = (slots: Equipment): void => {
  if (typeof slots !== 'object' || slots === null || Array.isArray(slots)) {
    throw new DataAccessError('El equipo debe ser un mapa de ranura a objeto.');
  }
  for (const [slot, itemId] of Object.entries(slots)) {
    if (typeof itemId !== 'string') {
      throw new DataAccessError(`La ranura "${slot}" no apunta a un objeto valido.`);
    }
  }
};

export function createEquipmentRepository(database: ZenithDatabase = db): EquipmentRepository {
  const table = database.equipment;

  return {
    async get(gameId, profileId) {
      try {
        const row = await table.get([gameId, profileId]);
        return row ? { ...row.slots } : {};
      } catch (error) {
        throw toDataError(error, 'leer el equipo');
      }
    },

    async save(gameId, profileId, slots) {
      assertSlots(slots);
      try {
        await table.put({ gameId, profileId, slots: { ...slots }, updatedAt: Date.now() });
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'guardar el equipo');
      }
    },

    async removeProfile(gameId, profileId) {
      try {
        await table.delete([gameId, profileId]);
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'borrar el equipo del personaje');
      }
    },

    async removeByGame(gameId) {
      try {
        await table.where('gameId').equals(gameId).delete();
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'borrar el equipo del juego');
      }
    },
  };
}

export const equipmentRepository = createEquipmentRepository();
