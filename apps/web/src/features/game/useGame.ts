import { useCallback, useEffect, useState } from 'react';

import { GameTemplateSchema, type GameTemplate, type Item } from '@zenith/shared-types';

import { gameCopy } from './copy';
import { getGameRepository } from './repositories';
import { resolveGame } from './sources';

export type GameState =
  | { status: 'loading' }
  | { status: 'ready'; template: GameTemplate; sampleItems: Item[]; published: boolean }
  | { status: 'error'; message: string };

export interface UseGameResult {
  state: GameState;
  retry: () => void;
}

const messageOf = (cause: unknown): string => {
  if (cause instanceof Error && cause.message) return cause.message;
  return gameCopy.errors.unknown;
};

/**
 * Resuelve el juego activo recorriendo los origenes declarados en
 * `sources.ts` y validando una sola vez lo que devuelvan.
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

    const load = async (): Promise<{
      template: GameTemplate;
      sampleItems: Item[];
      published: boolean;
    }> => {
      if (!id) throw new Error(gameCopy.errors.missing);

      const found = await resolveGame(id);
      if (!found) throw new Error(gameCopy.errors.notFound);

      const { sampleItems, published, source } = found;
      const parsed = GameTemplateSchema.safeParse(found.template);
      if (!parsed.success) throw new Error(gameCopy.errors.invalid);

      // `cloud` distingue un borrador propio de la copia de algo ajeno. Sin
      // esto, la portada listaria como tuyo cualquier optimizador del catalogo
      // que hubieras abierto una vez, porque aqui se cachean todos.
      await getGameRepository().save({
        id: parsed.data.gameId,
        template: parsed.data,
        cloud: source !== 'local',
      });
      return { template: parsed.data, sampleItems, published };
    };

    load()
      .then(({ template, sampleItems, published }) => {
        if (alive) setState({ status: 'ready', template, sampleItems, published });
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
