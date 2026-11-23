/**
 * Tipos de las filas que consume la app.
 *
 * Se mantienen a mano mientras no haya `supabase gen types` en el flujo; con el
 * CLI enlazado se regenera el archivo completo y se reemplazan estas interfaces.
 */

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

/** Fila de `optimizers` (plantilla completa; la vista del hub no la trae). */
export interface OptimizerRow {
  id: string;
  name: string;
  game_id: string;
  description: string;
  template: unknown;
  sample_items: unknown;
  published: boolean;
}

/**
 * Lo que la app ESCRIBE en `optimizers`.
 *
 * Es menos de lo que lee a proposito: `author_id` lo pone Postgres con
 * `auth.uid()`, y `score`, `votes_count` y las fechas no se tocan a mano. Los
 * grants de la migracion inicial solo permiten estas columnas, asi que mandar
 * una de mas no es un error de tipos sino un 403.
 */
export interface OptimizerWrite {
  name: string;
  game_name: string;
  description: string;
  template: unknown;
  sample_items: unknown;
  published: boolean;
  forked_from?: string;
}

/** Fila de la vista `optimizer_cards` (migracion 20261005000003). */
export interface OptimizerCardRow {
  id: string;
  name: string;
  description: string;
  /** Nombre del juego, resuelto desde `juego.nombre` por la vista. */
  game_name: string;
  category: string | null;
  cover: string | null;
  score: number;
  votes_count: number;
  created_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
}
