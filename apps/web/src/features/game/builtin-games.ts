import { parsePackage, type GamePackage } from '@zenith/data-access';

import type { CatalogOptimizer } from '../catalog/types';

/**
 * Juegos integrados SOLO para mocks y e2e. Con Supabase configurado la
 * plantilla viene de `optimizers`; en produccion esta lista queda vacia.
 */
export interface BuiltinGame {
  id: string;
  card: CatalogOptimizer;
  load(): Promise<GamePackage>;
}

const SEED_URL = '/seeds/gacha-demo.zenith.json';

let demoPackage: Promise<GamePackage> | undefined;

const loadDemo = (): Promise<GamePackage> => {
  demoPackage ??= fetch(SEED_URL)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`The demo seed is not available (${response.status}).`);
      }
      return parsePackage(await response.json());
    })
    .catch((cause) => {
      demoPackage = undefined;
      throw cause;
    });

  return demoPackage;
};

const demoCard: CatalogOptimizer = {
  id: 'gacha-demo',
  name: 'Astral Forge optimizer',
  gameName: 'Astral Forge',
  description:
    'A synthetic gacha game for demos: weapons, artifacts and a non-linear damage formula. Its data is public and forkable.',
  author: { id: 'zenith', displayName: 'ZenithOptimizer' },
  score: 160,
  votesCount: 0,
  createdAt: '2026-11-06T00:00:00.000Z',
  category: 'Gacha',
  published: true,
};

/**
 * Solo lo consume el repositorio mock (sin Supabase). Con Supabase configurado
 * el hub lee los optimizadores publicados y esta tarjeta no aparece.
 */
export const builtinGames: BuiltinGame[] = [
  {
    id: 'gacha-demo',
    card: demoCard,
    load: loadDemo,
  },
];

export const builtinCards: CatalogOptimizer[] = builtinGames.map((game) => game.card);

export function findBuiltinGame(id: string): BuiltinGame | undefined {
  return builtinGames.find((game) => game.id === id);
}
