import type { Item } from '@zenith/shared-types';

import { db, type ImageRow, type ZenithDatabase } from './db.js';
import { DataAccessError, toDataError } from './errors.js';
import { createEmitter } from './events.js';
import type { ImageMap, ImagesRepository } from './ports.js';
import { normalizeKey } from './text.js';

/** Lado del icono guardado, en pixeles. Se muestra a 44-52 px: 128 sobra para retina. */
export const ICON_SIZE = 128;

/** Tope por imagen en un paquete importado (data URL, en caracteres). */
export const MAX_DATA_URL = 300_000;

const DATA_URL_OK = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const changes = createEmitter<string>();

/** Avisa que cambiaron las imagenes de un juego. */
export const onImagesChanged = changes.subscribe;

const rowId = (gameId: string, key: string) => `${gameId}::${key}`;

/** Clave de imagen del retrato de un perfil (personaje). */
export const portraitKey = (profileId: string): string => normalizeKey(`retrato ${profileId}`);

/** Clave de imagen de un objeto: el nombre normalizado. */
export const imageKeyOf = (item: Item): string => normalizeKey(item.name);

/**
 * Filtra un mapa de imagenes que viene de fuera: solo data URLs de imagen y por
 * debajo del tope. Un paquete ajeno no puede llenar el disco.
 */
export function sanitizeImages(raw: unknown): ImageMap {
  const out: ImageMap = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'string' || value.length > MAX_DATA_URL || !DATA_URL_OK.test(value)) continue;
    const normalized = normalizeKey(key);
    if (normalized) out[normalized] = value;
  }
  return out;
}

/** Solo las imagenes de objetos que existen en el inventario (para exportar). */
export function imagesForItems(all: ImageMap, items: Item[]): ImageMap {
  const keys = new Set(items.map(imageKeyOf));
  const out: ImageMap = {};
  for (const [key, value] of Object.entries(all)) if (keys.has(key)) out[key] = value;
  return out;
}

export function createImagesRepository(database: ZenithDatabase = db): ImagesRepository {
  const table = database.images;

  const rowsOf = (gameId: string): Promise<ImageRow[]> =>
    table.where('gameId').equals(gameId).toArray();

  const readAll = async (gameId: string): Promise<ImageMap> => {
    const out: ImageMap = {};
    for (const row of await rowsOf(gameId)) out[row.key] = row.data;
    return out;
  };

  const importMany = async (gameId: string, images: ImageMap): Promise<number> => {
    const ok = Object.entries(sanitizeImages(images));
    if (ok.length === 0) return 0;
    const now = Date.now();
    await table.bulkPut(
      ok.map(([key, data]) => ({
        id: rowId(gameId, key),
        gameId,
        key,
        data,
        updatedAt: now,
      })),
    );
    changes.emit(gameId);
    return ok.length;
  };

  return {
    async get(gameId) {
      try {
        return await readAll(gameId);
      } catch (error) {
        throw toDataError(error, 'leer las imagenes');
      }
    },

    async set(gameId, key, data) {
      const normalized = normalizeKey(key);
      if (!normalized) throw new DataAccessError('La imagen necesita un nombre.');
      if (!DATA_URL_OK.test(data)) throw new DataAccessError('Formato de imagen no admitido.');
      if (data.length > MAX_DATA_URL) throw new DataAccessError('La imagen es demasiado grande.');
      try {
        await table.put({
          id: rowId(gameId, normalized),
          gameId,
          key: normalized,
          data,
          updatedAt: Date.now(),
        });
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'guardar la imagen');
      }
    },

    async remove(gameId, key) {
      try {
        await table.delete(rowId(gameId, normalizeKey(key)));
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'borrar la imagen');
      }
    },

    async import(gameId, images) {
      try {
        return await importMany(gameId, images);
      } catch (error) {
        throw toDataError(error, 'importar las imagenes');
      }
    },

    async removeByGame(gameId) {
      try {
        await table.where('gameId').equals(gameId).delete();
        changes.emit(gameId);
      } catch (error) {
        throw toDataError(error, 'borrar las imagenes del juego');
      }
    },

    async copy(fromGameId, toGameId) {
      try {
        const images = await readAll(fromGameId);
        await importMany(toGameId, images);
      } catch (error) {
        throw toDataError(error, 'copiar las imagenes');
      }
    },
  };
}

export const imagesRepository = createImagesRepository();
