import { GameTemplateSchema, ItemSchema, type GameTemplate, type Item } from '@zenith/shared-types';
import { DataAccessError } from '@zenith/data-access';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { OptimizerRow, OptimizerWrite } from '../../lib/database.types';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const COLUMNS = ['id', 'name', 'game_name', 'description', 'template', 'sample_items', 'published'].join(',');

/** Optimizador publicado: la plantilla completa mas sus objetos de muestra. */
export interface OptimizerRecord {
  id: string;
  name: string;
  gameName: string;
  description: string;
  template: GameTemplate;
  sampleItems: Item[];
  /** Visible en el catalogo. Un borrador propio tambien se puede abrir. */
  published: boolean;
}

/**
 * Lo que se guarda en la cuenta.
 *
 * Solo la plantilla. Los objetos del jugador NO viajan: son suyos, viven en su
 * navegador y se importan por JSON o se escriben a mano. Por eso `sample_items`
 * sale vacio y no hay forma de pasarle el inventario desde aqui, que es la
 * unica garantia de verdad de que no se filtre por descuido.
 */
export interface OptimizerDraft {
  template: GameTemplate;
  /** Si sale en el catalogo de la comunidad. Lo decide el autor. */
  shared: boolean;
  /**
   * El optimizador del que salio, si se abrio uno ajeno y se edito. Solo un
   * uuid: un id local no existe en Postgres y la clave foranea lo rechazaria.
   */
  forkedFrom?: string;
}

export interface OptimizerRepository {
  getOptimizer(id: string): Promise<OptimizerRecord | undefined>;
  /** Inserta y devuelve el id de la fila nueva. */
  createOptimizer(draft: OptimizerDraft): Promise<string>;
  /** Pisa la fila existente. Falla si no es tuya: lo decide la RLS. */
  updateOptimizer(id: string, draft: OptimizerDraft): Promise<void>;
  /**
   * Saca el optimizador de la nube. El borrador local no se toca: son dos
   * guardados distintos y quitar uno no tiene por que llevarse el otro.
   */
  deleteOptimizer(id: string): Promise<void>;
}

/**
 * Plantilla a columnas.
 *
 * `name` y `game_name` salen los dos del nombre de la plantilla porque el
 * editor pide un nombre y no dos. La tabla los separa para un futuro en que un
 * juego tenga varios optimizadores; hasta que ese caso exista, duplicarlo es
 * mas honesto que inventarse un valor distinto.
 */
export function toOptimizerWrite(draft: OptimizerDraft): OptimizerWrite {
  const { template, shared, forkedFrom } = draft;
  return {
    name: template.name,
    game_name: template.name,
    description: template.description,
    template,
    sample_items: [],
    published: shared,
    ...(forkedFrom ? { forked_from: forkedFrom } : {}),
  };
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
    published: row.published === true,
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

    async createOptimizer(draft: OptimizerDraft): Promise<string> {
      const { data, error } = await client
        .from('optimizers')
        .insert(toOptimizerWrite(draft))
        .select('id')
        .single();

      if (error) throw new DataAccessError(error.message, { cause: error });
      return (data as { id: string }).id;
    },

    async updateOptimizer(id: string, draft: OptimizerDraft): Promise<void> {
      // `forked_from` no se reescribe: de donde salio algo no cambia porque se
      // vuelva a guardar.
      const { forked_from: _ignored, ...columns } = toOptimizerWrite(draft);
      const { error } = await client.from('optimizers').update(columns).eq('id', id);

      if (error) throw new DataAccessError(error.message, { cause: error });
    },

    async deleteOptimizer(id: string): Promise<void> {
      const { error } = await client.from('optimizers').delete().eq('id', id);
      if (error) throw new DataAccessError(error.message, { cause: error });
    },
  };
}

const sinNube = () =>
  new DataAccessError('Esta instalacion no tiene cuentas configuradas, asi que no hay donde guardar.');

/** Sin Supabase no hay optimizadores remotos: la app cae al juego integrado. */
export const defaultOptimizerRepository: OptimizerRepository = {
  async getOptimizer() {
    return undefined;
  },
  async createOptimizer() {
    throw sinNube();
  },
  async updateOptimizer() {
    throw sinNube();
  },
  async deleteOptimizer() {
    throw sinNube();
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
