import type { CatalogOptimizer } from './types';

export type SortKey = 'top' | 'new' | 'az';

/** Un optimizador necesita al menos este puntaje para pasar "Top rated only". */
export const TOP_RATED_MIN_SCORE = 50;

export const UNCATEGORIZED = 'Uncategorized';

export interface CatalogFilterState {
  category: string;
  query: string;
  sort: SortKey;
  topOnly: boolean;
}

export const initialFilterState: CatalogFilterState = {
  category: 'all',
  query: '',
  sort: 'top',
  topOnly: false,
};

export interface CategoryFacet {
  name: string;
  count: number;
}

const categoryOf = (optimizer: CatalogOptimizer): string =>
  optimizer.category?.trim() || UNCATEGORIZED;

export function categoryFacets(list: CatalogOptimizer[]): CategoryFacet[] {
  const counts = new Map<string, number>();

  for (const optimizer of list) {
    const category = categoryOf(optimizer);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function filterOptimizers(
  list: CatalogOptimizer[],
  state: CatalogFilterState,
): CatalogOptimizer[] {
  const query = state.query.trim().toLowerCase();

  return list
    .filter((optimizer) => state.category === 'all' || categoryOf(optimizer) === state.category)
    .filter((optimizer) => !state.topOnly || optimizer.score >= TOP_RATED_MIN_SCORE)
    .filter((optimizer) => {
      if (!query) return true;
      const haystack =
        `${optimizer.name} ${optimizer.gameName} ${optimizer.author.displayName}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      if (state.sort === 'new') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (state.sort === 'az') return a.name.localeCompare(b.name);
      return b.score - a.score || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
}

/** Puestos 1..3 por puntaje, para el reconocimiento visual de HUB-01. */
export function topRanks(list: CatalogOptimizer[], places = 3): Map<string, number> {
  const ranked = [...list].sort((a, b) => b.score - a.score).slice(0, places);
  return new Map(ranked.map((optimizer, index) => [optimizer.id, index + 1]));
}
