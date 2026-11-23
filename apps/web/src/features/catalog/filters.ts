import type { CatalogOptimizer } from './types';

export type SortKey = 'top' | 'new' | 'az';

/** Un optimizador necesita al menos este puntaje para pasar "Top rated only". */
export const TOP_RATED_MIN_SCORE = 50;

/** Lo que se muestra cuando el juego no tiene ningun genero asignado. */
export const UNCATEGORIZED = 'Uncategorized';

export interface CatalogFilterState {
  /** Un genero concreto, o `all`. */
  genre: string;
  query: string;
  sort: SortKey;
  topOnly: boolean;
}

export const initialFilterState: CatalogFilterState = {
  genre: 'all',
  query: '',
  sort: 'top',
  topOnly: false,
};

export interface GenreFacet {
  name: string;
  count: number;
}

/**
 * Los generos de un optimizador, o el cajon de los que no tienen ninguno.
 *
 * Antes esto era una sola categoria de texto libre. Ahora el juego puede tener
 * varios generos del catalogo, y eso cambia las dos cuentas de abajo: un
 * optimizador suma en cada uno de sus generos, asi que las facetas ya no suman
 * el total de la lista.
 */
const genresOf = (optimizer: CatalogOptimizer): string[] => {
  const limpios = optimizer.genres.map((genre) => genre.trim()).filter(Boolean);
  return limpios.length > 0 ? limpios : [UNCATEGORIZED];
};

export function genreFacets(list: CatalogOptimizer[]): GenreFacet[] {
  const counts = new Map<string, number>();

  for (const optimizer of list) {
    for (const genre of genresOf(optimizer)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
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
    // Basta con que tenga el genero elegido entre los suyos.
    .filter((optimizer) => state.genre === 'all' || genresOf(optimizer).includes(state.genre))
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
