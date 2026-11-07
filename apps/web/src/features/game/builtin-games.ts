import { parsePackage, type GamePackage } from '@zenith/data-access';

import type { CatalogOptimizer } from '../catalog/types';

/**
 * Juegos integrados. Solo se usan como respaldo: cuando Supabase esta
 * configurado la plantilla viene de `optimizers`; esto cubre el modo mock, el
 * e2e y las rutas antiguas que aun apuntan al id del juego.
 */
export interface BuiltinGame {
  id: string;
  card: CatalogOptimizer;
  load(): Promise<GamePackage>;
}

const SEED_URL = '/seeds/genshin.zenith.json';

let genshinPackage: Promise<GamePackage> | undefined;

const loadGenshin = (): Promise<GamePackage> => {
  genshinPackage ??= fetch(SEED_URL)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`The Genshin seed is not available (${response.status}).`);
      }
      return parsePackage(await response.json());
    })
    .catch((cause) => {
      genshinPackage = undefined;
      throw cause;
    });

  return genshinPackage;
};

const genshinCard: CatalogOptimizer = {
  id: 'genshin',
  name: 'Genshin Impact optimizer',
  gameName: 'Genshin Impact',
  description:
    'Arm, five artifacts, 44 sets and 121 characters. Bring your inventory and let the solver prove the build.',
  author: { id: 'zenith', displayName: 'ZenithOptimizer' },
  score: 160,
  votesCount: 0,
  createdAt: '2026-11-06T00:00:00.000Z',
  category: 'Gacha',
  published: true,
};

export const builtinGames: BuiltinGame[] = [
  {
    id: 'genshin',
    card: genshinCard,
    load: loadGenshin,
  },
];

export const builtinCards: CatalogOptimizer[] = builtinGames.map((game) => game.card);

export function findBuiltinGame(id: string): BuiltinGame | undefined {
  return builtinGames.find((game) => game.id === id);
}
