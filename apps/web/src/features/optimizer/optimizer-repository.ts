import { GameTemplateSchema, ItemSchema, type GameTemplate, type Item } from '@zenith/shared-types';
import { DataAccessError } from '@zenith/data-access';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { OptimizerRow } from '../../lib/database.types';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const COLUMNS = ['id', 'name', 'game_name', 'description', 'template', 'sample_items'].join(',');

/** Optimizador publicado: la plantilla completa mas sus objetos de muestra. */
export interface OptimizerRecord {
  id: string;
  name: string;
  gameName: string;
  description: string;
  template: GameTemplate;
  sampleItems: Item[];
}

export interface OptimizerRepository {
  getOptimizer(id: string): Promise<OptimizerRecord | undefined>;
}

/** Fila de `optimizers` → modelo validado. Nada entra sin pasar por Zod. */
export function mapOptimizerRow(row: OptimizerRow): OptimizerRecord {
  const template = GameTemplateSchema.safeParse(row.template);
  if (!template.success) {
    throw new DataAccessError('La plantilla del optimizador no es valida.', {
      cause: template.error,
    });
  }

  const rawItems = Array.isArray(row.sample_items) ? row.sample_items : [];
  const sampleItems = rawItems.map((raw, index) => {
    const parsed = ItemSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DataAccessError(`El objeto de muestra ${index + 1} no es valido.`, {
        cause: parsed.error,
      });
    }
    return parsed.data;
  });

  return {
    id: row.id,
    name: row.name,
    gameName: row.game_name,
    description: row.description,
    template: template.data,
    sampleItems,
  };
}

export function createSupabaseOptimizerRepository(client: SupabaseClient): OptimizerRepository {
  return {
    async getOptimizer(id: string): Promise<OptimizerRecord | undefined> {
      const { data, error } = await client
        .from('optimizers')
        .select(COLUMNS)
        .eq('id', id)
        .maybeSingle();

      if (error) throw new DataAccessError(error.message, { cause: error });
      if (!data) return undefined;

      return mapOptimizerRow(data as unknown as OptimizerRow);
    },
  };
}

/** Sin Supabase no hay optimizadores remotos: la app cae al juego integrado. */
export const defaultOptimizerRepository: OptimizerRepository = {
  async getOptimizer() {
    return undefined;
  },
};

let current: OptimizerRepository =
  isSupabaseConfigured && supabase
    ? createSupabaseOptimizerRepository(supabase)
    : defaultOptimizerRepository;

export function getOptimizerRepository(): OptimizerRepository {
  return current;
}

export function setOptimizerRepository(next: OptimizerRepository): void {
  current = next;
}
