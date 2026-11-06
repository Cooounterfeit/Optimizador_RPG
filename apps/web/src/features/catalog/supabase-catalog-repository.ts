import type { OptimizerCardRow } from '../../lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { CatalogOptimizer, CatalogRepository } from './types';

const COLUMNS = [
  'id',
  'name',
  'description',
  'game_name',
  'category',
  'cover',
  'score',
  'votes_count',
  'created_at',
  'author_id',
  'author_name',
  'author_avatar',
].join(',');

const LIST_LIMIT = 60;

/** Fila de `optimizer_cards` → modelo de la tarjeta. */
export function mapCard(row: OptimizerCardRow): CatalogOptimizer {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    gameName: row.game_name,
    author: {
      id: row.author_id,
      displayName: row.author_name,
      avatarUrl: row.author_avatar ?? undefined,
    },
    score: row.score,
    votesCount: row.votes_count,
    createdAt: row.created_at,
    category: row.category ?? undefined,
    cover: row.cover ?? undefined,
    published: true,
  };
}

/**
 * Adaptador real del catalogo (F5). Lee de la vista `optimizer_cards`, que no
 * incluye `template` ni `sample_items`: el hub no necesita bajar la config
 * completa del juego.
 */
export function createSupabaseCatalogRepository(client: SupabaseClient): CatalogRepository {
  return {
    async list(): Promise<CatalogOptimizer[]> {
      const { data, error } = await client
        .from('optimizer_cards')
        .select(COLUMNS)
        .order('score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);

      if (error) throw new Error(error.message);

      return (data as unknown as OptimizerCardRow[]).map(mapCard);
    },
  };
}
