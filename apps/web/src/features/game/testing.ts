import type { GameRepository, InventoryRepository } from '@zenith/data-access';
import type { GameTemplate, Item } from '@zenith/shared-types';

import type { OptimizerRepository } from '../optimizer/optimizer-repository';

/**
 * Dobles de repositorio para las pruebas
 * ======================================
 * Estaban copiados en seis archivos de prueba, cuatro de ellos identicos linea
 * por linea. Es la misma duplicacion que se quito del codigo, y aqui tambien
 * tiene un coste real: cuando a un puerto le crece un metodo, hay que acordarse
 * de anadirlo en seis sitios o las pruebas dejan de compilar de a una.
 *
 * Viven en `features/game/` y no en una carpeta de pruebas aparte porque es
 * donde estan los puertos que doblan, siguiendo lo que ya hacia
 * `optimizer/workspace/testing.tsx`.
 */

/** Inventario en memoria. Lo que importa de el es que resuelva, no que guarde. */
export function fakeInventoryRepository(
  items: readonly Item[] = [],
): InventoryRepository {
  return {
    addItem: async () => undefined,
    getAll: async () => [...items],
    getById: async (id: string) => items.find((item) => item.id === id),
    updateItem: async () => undefined,
    removeItem: async () => undefined,
    searchItems: async () => [...items],
    removeByGame: async () => undefined,
  } as unknown as InventoryRepository;
}

export interface SavedGame {
  id: string;
  template: GameTemplate;
}

export interface FakeGames {
  repo: GameRepository;
  /** Lo que se mando a guardar, en orden. Es lo que suelen comprobar las pruebas. */
  saved: SavedGame[];
}

/**
 * Repositorio de juegos en memoria.
 *
 * `rows` son los que ya existen, para probar las colisiones de nombre y de id.
 */
export function fakeGameRepository(
  rows: readonly Partial<SavedGame>[] = [],
): FakeGames {
  const saved: SavedGame[] = [];
  const existing = rows.map((row) => ({
    id: row.id ?? '',
    template: (row.template ?? {}) as GameTemplate,
    updatedAt: 0,
  }));
  const repo = {
    list: async () => existing,
    get: async (id: string) => existing.find((row) => row.id === id),
    save: async (game: SavedGame) => {
      saved.push(game);
      return game;
    },
    remove: async () => undefined,
    clearLocalData: async () => undefined,
  } as unknown as GameRepository;
  return { repo, saved };
}

/**
 * Optimizadores remotos en memoria.
 *
 * Casi todas las pruebas solo necesitan `getOptimizer`, pero el puerto tambien
 * escribe desde que se puede guardar en la cuenta. El doble completo deja que
 * cada prueba sobreescriba solo lo que le importa, en vez de repetir los
 * metodos que no usa.
 */
export function fakeOptimizerRepository(
  partial: Partial<OptimizerRepository> = {},
): OptimizerRepository {
  return {
    getOptimizer: async () => undefined,
    createOptimizer: async () => 'uuid-de-prueba',
    updateOptimizer: async () => undefined,
    ...partial,
  };
}
