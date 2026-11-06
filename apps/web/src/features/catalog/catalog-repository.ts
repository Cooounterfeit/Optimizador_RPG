import { isSupabaseConfigured, supabase } from '../../lib/supabase';

import { catalogFixtures } from './fixtures';
import { createSupabaseCatalogRepository } from './supabase-catalog-repository';
import type { CatalogOptimizer, CatalogRepository } from './types';

/**
 * Sin variables de entorno el hub sigue con fixtures; con ellas, lee los
 * optimizadores publicados de Supabase. Los componentes no cambian.
 */
export const mockCatalogRepository: CatalogRepository = {
  async list(): Promise<CatalogOptimizer[]> {
    return catalogFixtures;
  },
};

export const defaultCatalogRepository: CatalogRepository =
  isSupabaseConfigured && supabase
    ? createSupabaseCatalogRepository(supabase)
    : mockCatalogRepository;

let current: CatalogRepository = defaultCatalogRepository;

export function getCatalogRepository(): CatalogRepository {
  return current;
}

export function setCatalogRepository(next: CatalogRepository): void {
  current = next;
}
