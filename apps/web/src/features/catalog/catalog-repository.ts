import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { builtinCards } from '../game/builtin-games';

import { catalogFixtures } from './fixtures';
import { createSupabaseCatalogRepository } from './supabase-catalog-repository';
import type { CatalogOptimizer, CatalogRepository } from './types';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === '1';

/**
 * Solo para mock/e2e: fixtures y juegos integrados. Con Supabase configurado
 * el hub lee los optimizadores publicados; sin Supabase y sin mocks no inventa
 * un catalogo.
 */
export const mockCatalogRepository: CatalogRepository = {
  async list(): Promise<CatalogOptimizer[]> {
    return [...builtinCards, ...catalogFixtures];
  },
};

const emptyCatalogRepository: CatalogRepository = {
  async list(): Promise<CatalogOptimizer[]> {
    return [];
  },
};

export const defaultCatalogRepository: CatalogRepository =
  isSupabaseConfigured && supabase
    ? createSupabaseCatalogRepository(supabase)
    : USE_MOCKS
      ? mockCatalogRepository
      : emptyCatalogRepository;

let current: CatalogRepository = defaultCatalogRepository;

export function getCatalogRepository(): CatalogRepository {
  return current;
}

export function setCatalogRepository(next: CatalogRepository): void {
  current = next;
}
