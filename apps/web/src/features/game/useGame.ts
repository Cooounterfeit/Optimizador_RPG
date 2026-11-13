import { useCallback, useEffect, useState } from 'react';

import { GameTemplateSchema, type GameTemplate, type Item } from '@zenith/shared-types';

import { getOptimizerRepository } from '../optimizer/optimizer-repository';
import { findBuiltinGame } from './builtin-games';
import { gameCopy } from './copy';
import { getGameRepository } from './repositories';

export type GameState =
  | { status: 'loading' }
  | { status: 'ready'; template: GameTemplate; sampleItems: Item[] }
  | { status: 'error'; message: string };

export interface UseGameResult {
  state: GameState;
  retry: () => void;
}

/**
 * La tabla `optimizers` usa uuid como clave. Un id de juego integrado no debe
 * llegar a Postgres: la consulta fallaria con "invalid input syntax for type
 * uuid".
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === '1';

const messageOf = (cause: unknown): string => {
  if (cause instanceof Error && cause.message) return cause.message;
  return gameCopy.errors.unknown;
};

/**
 * Resuelve el juego activo.
 *
 * 1. Supabase (`optimizers`) si hay un registro con ese id.
 * 2. Juego integrado (`/seeds`) solo con `VITE_USE_MOCKS=1` (mock/e2e).
 * 3. Error con la causa.
 *
 * La cache local siempre se indexa por `template.gameId` (no por el id de la
 * fila): el inventario pertenece al juego, no al optimizador publicado.
 */
export function useGame(id: string): UseGameResult {
  const [state, setState] = useState<GameState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });

    const load = async (): Promise<{ template: GameTemplate; sampleItems: Item[] }> => {
      if (!id) throw new Error(gameCopy.errors.missing);

      let template: GameTemplate | undefined;
      let sampleItems: Item[] = [];

      if (UUID_PATTERN.test(id)) {
        const record = await getOptimizerRepository().getOptimizer(id);
        template = record?.template;
        sampleItems = record?.sampleItems ?? [];
      }

      if (!template && USE_MOCKS) {
        const builtin = findBuiltinGame(id);
        if (builtin) {
          const pkg = await builtin.load();
          template = pkg.template;
          sampleItems = pkg.items;
        }
      }

      if (!template) throw new Error(gameCopy.errors.notFound);

      const parsed = GameTemplateSchema.safeParse(template);
      if (!parsed.success) throw new Error(gameCopy.errors.invalid);

      await getGameRepository().save({ id: parsed.data.gameId, template: parsed.data });
      return { template: parsed.data, sampleItems };
    };

    load()
      .then(({ template, sampleItems }) => {
        if (alive) setState({ status: 'ready', template, sampleItems });
      })
      .catch((cause) => {
        if (alive) setState({ status: 'error', message: messageOf(cause) });
      });

    return () => {
      alive = false;
    };
  }, [id, attempt]);

  return { state, retry };
}
