/**
 * Un optimizador publicado, con la forma que tendra `optimizers` cuando F5
 * conecte Supabase (mas el autor resuelto desde `profiles`).
 */
export interface CatalogOptimizer {
  id: string;
  name: string;
  gameName: string;
  description: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  score: number;
  votesCount: number;
  createdAt: string;
  /** Generos del juego, del catalogo. Puede venir vacio. */
  genres: string[];
  cover?: string;
  published: boolean;
}

export interface CatalogRepository {
  list(): Promise<CatalogOptimizer[]>;
}
