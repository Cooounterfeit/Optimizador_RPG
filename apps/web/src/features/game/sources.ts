import type { Item } from '@zenith/shared-types';

import { getOptimizerRepository } from '../optimizer/optimizer-repository';
import { findBuiltinGame } from './builtin-games';
import { getGameRepository } from './repositories';

/**
 * Origenes de un juego
 * ====================
 * De donde puede salir la plantilla que el workspace abre. Antes era un `if`
 * encadenado dentro de `useGame`; ahora es una lista, porque el editor de
 * plantillas va a sumar origenes (un borrador local hoy, una version del
 * historial manana) y cada uno debe poder entrar sin tocar la logica de carga.
 *
 * El contrato es deliberadamente pobre: un origen dice si sabe resolver un id
 * y devuelve lo que encuentre, sin validar. Quien valida es `useGame`, una sola
 * vez y para todos, con el esquema de `shared-types`. Asi un origen nuevo no
 * puede colarse saltandose la validacion.
 */
export interface GameSourceResult {
  /** Sin validar: `useGame` lo pasa por el esquema antes de usarlo. */
  template: unknown;
  sampleItems: Item[];
  /**
   * Si esta visible en el catalogo. Lo dice el origen porque solo el lo sabe:
   * lo local nunca esta publicado, y en Supabase un borrador propio se abre
   * igual que uno publicado.
   */
  published: boolean;
}

export interface GameSource {
  /** Para distinguirlos en las pruebas y en los mensajes de error. */
  id: string;
  /** Si devuelve false, el origen ni se consulta. */
  canHandle: (id: string) => boolean;
  /** `undefined` significa "yo no lo tengo", no "no existe". */
  load: (id: string) => Promise<GameSourceResult | undefined>;
}

/**
 * La tabla `optimizers` usa uuid como clave. Un id que no lo sea no debe llegar
 * a Postgres: la consulta fallaria con "invalid input syntax for type uuid".
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (id: string): boolean => UUID_PATTERN.test(id);

/** Un optimizador publicado (o un borrador propio) en Supabase. */
export const remoteSource: GameSource = {
  id: 'remote',
  canHandle: isUuid,
  async load(id) {
    const record = await getOptimizerRepository().getOptimizer(id);
    if (!record) return undefined;
    return {
      template: record.template,
      sampleItems: record.sampleItems ?? [],
      published: record.published,
    };
  },
};

/**
 * La copia en este navegador.
 *
 * `useGame` ya guardaba aqui todo lo que cargaba, pero nadie lo leia: era una
 * cache de solo escritura. Al leerla, dos cosas pasan a funcionar: un juego
 * creado desde el editor se abre sin haberlo publicado, y uno visto antes se
 * abre sin red.
 */
export const localSource: GameSource = {
  id: 'local',
  canHandle: (id) => id.length > 0,
  async load(id) {
    const row = await getGameRepository().get(id);
    if (!row) return undefined;
    return { template: row.template, sampleItems: [], published: false };
  },
};

/** Juegos de ejemplo servidos desde `/seeds`. Solo en mocks y en e2e. */
export const seedSource: GameSource = {
  id: 'seed',
  canHandle: () => import.meta.env.VITE_USE_MOCKS === '1',
  async load(id) {
    const builtin = findBuiltinGame(id);
    if (!builtin) return undefined;
    const pkg = await builtin.load();
    return { template: pkg.template, sampleItems: pkg.items, published: true };
  },
};

/**
 * El orden es el de preferencia y no es casual: lo remoto manda sobre la copia
 * local para que una plantilla editada en otro dispositivo no quede escondida
 * detras de una version vieja en cache.
 */
export const GAME_SOURCES: GameSource[] = [remoteSource, localSource, seedSource];

/** Lo que devuelve un origen, mas cual fue. */
export interface ResolvedGame extends GameSourceResult {
  /**
   * El origen que lo resolvio. Importa fuera de aqui: lo que no vino de
   * `local` es una COPIA de algo ajeno, y la portada no debe listarlo entre
   * los borradores del autor.
   */
  source: string;
}

/** Primer origen que sepa resolver el id y tenga algo. */
export async function resolveGame(
  id: string,
  sources: GameSource[] = GAME_SOURCES,
): Promise<ResolvedGame | undefined> {
  for (const source of sources) {
    if (!source.canHandle(id)) continue;
    const found = await source.load(id);
    if (found) return { ...found, source: source.id };
  }
  return undefined;
}
