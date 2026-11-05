import { catalogFixtures } from './fixtures';
import type { CatalogOptimizer, CatalogRepository } from './types';

/**
 * Adaptador de F4: devuelve fixtures con la forma de `optimizers`.
 * F5 reemplaza esto por `SupabaseCatalogRepository` y los componentes no cambian.
 */
export const mockCatalogRepository: CatalogRepository = {
  async list(): Promise<CatalogOptimizer[]> {
    return catalogFixtures;
  },
};

let current: CatalogRepository = mockCatalogRepository;

export function getCatalogRepository(): CatalogRepository {
  return current;
}

export function setCatalogRepository(next: CatalogRepository): void {
  current = next;
}
