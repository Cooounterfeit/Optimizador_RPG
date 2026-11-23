import { GameTemplateSchema, ItemSchema, type GameTemplate, type Item } from '@zenith/shared-types';
import { DataAccessError } from '@zenith/data-access';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { OptimizerRow, OptimizerWrite } from '../../lib/database.types';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const COLUMNS = [
  'id',
  'name',
  'description',
  'template',
  'sample_items',
  // Se leia `row.published` sin pedirlo, asi que TODO optimizador de la nube
  // se reportaba como no publicado.
  'published',
  'game:game_id(name)',
].join(',');

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
 * El juego ya no viaja como texto: `game_id` apunta al catalogo, y quien lo
 * resuelve es `resolveGameId`, porque puede implicar crearlo.
 */
export function toOptimizerWrite(draft: OptimizerDraft, gameId: string): OptimizerWrite {
  const { template, shared, forkedFrom } = draft;
  return {
    name: template.name,
    game_id: gameId,
    description: template.description,
    template,
    sample_items: [],
    published: shared,
    ...(forkedFrom ? { forked_from: forkedFrom } : {}),
  };
}

/**
 * El juego al que pertenece un optimizador.
 *
 * Lo resuelve Postgres, no el cliente. `game_insert` exige `is_admin()`, asi
 * que un usuario normal no puede crear juegos: sin esto, quien estrena un juego
 * que no esta en el catalogo no podria guardar su optimizador, porque
 * `optimizers.game_id` es not null desde que se unifico el juego.
 *
 * `ensure_game` (20261126000002) es `security definer` y abre un camino
 * estrecho: exige sesion, reutiliza antes de crear con la misma normalizacion
 * que el indice unico del catalogo, recorta el nombre a lo que admite la
 * columna y anota quien lo creo. La politica de administrador para el insert
 * directo se queda intacta.
 *
 * Hacerlo en una sola llamada tambien quita la carrera que tenia la version
 * anterior, que buscaba y despues insertaba desde el navegador.
 */
export async function resolveGameId(
  client: SupabaseClient,
  nombre: string,
): Promise<string> {
  const { data, error } = await client.rpc('ensure_game', { p_name: nombre });

  if (error) throw new DataAccessError(error.message, { cause: error });
  if (!data) {
    throw new DataAccessError('No se pudo registrar el juego de este optimizador.');
  }

  return data as string;
}

/** La fila con el juego resuelto por el join de `COLUMNS`. */
type JoinedOptimizerRow = OptimizerRow & { game: { name: string } | null };

/** Fila de `optimizers` → modelo validado. Nada entra sin pasar por Zod. */
export function mapOptimizerRow(row: JoinedOptimizerRow): OptimizerRecord {
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

  // `game_id` es NOT NULL con FK, asi que el join siempre resuelve. Si aun asi
  // no viene, la fila no es coherente y se trata como dato invalido.
  if (!row.game) {
    throw new DataAccessError('El optimizador no tiene un juego asociado valido.');
  }

  return {
    id: row.id,
    name: row.name,
    gameName: row.game.name,
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

      return mapOptimizerRow(data as unknown as JoinedOptimizerRow);
    },

    async createOptimizer(draft: OptimizerDraft): Promise<string> {
      const gameId = await resolveGameId(client, draft.template.name);
      const { data, error } = await client
        .from('optimizers')
        .insert(toOptimizerWrite(draft, gameId))
        .select('id')
        .single();

      if (error) throw new DataAccessError(error.message, { cause: error });
      return (data as { id: string }).id;
    },

    async updateOptimizer(id: string, draft: OptimizerDraft): Promise<void> {
      // Ni `forked_from` ni `game_id` se reescriben. De donde salio algo no
      // cambia porque se vuelva a guardar, y renombrar tu optimizador no
      // deberia moverlo a otro juego ni dejar uno huerfano en el catalogo.
      const {
        forked_from: _origen,
        game_id: _juego,
        ...columns
      } = toOptimizerWrite(draft, '');
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
