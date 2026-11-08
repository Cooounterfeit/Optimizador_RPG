import { gachaPointer, loadGachaCatalog, type GachaCatalog } from '@zenith/gacha';
import type { GameTemplate } from '@zenith/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type GachaCatalogState =
  | { status: 'idle'; catalog: null; error: null }
  | { status: 'loading'; catalog: null; error: null }
  | { status: 'ready'; catalog: GachaCatalog; error: null }
  | { status: 'error'; catalog: null; error: string };

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message
    ? cause.message
    : 'Could not load the gacha catalog.';

/**
 * Carga bajo demanda el catalogo apuntado por la plantilla. Solo las pantallas
 * que lo necesitan montan este hook; el resto del optimizador no lo descarga.
 */
export function useGachaCatalog(template: GameTemplate) {
  const pointer = useMemo(() => gachaPointer(template), [template]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<GachaCatalogState>({
    status: pointer ? 'loading' : 'idle',
    catalog: null,
    error: null,
  });

  useEffect(() => {
    if (!pointer) {
      setState({ status: 'idle', catalog: null, error: null });
      return;
    }

    let alive = true;
    setState({ status: 'loading', catalog: null, error: null });

    loadGachaCatalog(pointer)
      .then((catalog) => {
        if (alive) setState({ status: 'ready', catalog, error: null });
      })
      .catch((cause) => {
        if (alive) setState({ status: 'error', catalog: null, error: messageOf(cause) });
      });

    return () => {
      alive = false;
    };
  }, [pointer, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
