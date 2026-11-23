import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { DataAccessError } from '@zenith/data-access';
import type { GameTemplate } from '@zenith/shared-types';

import { useAuth } from '../auth/AuthProvider';
import { getGameRepository } from '../game/repositories';
import { isUuid } from '../game/sources';
import {
  getOptimizerRepository,
  type OptimizerDraft,
} from '../optimizer/optimizer-repository';

import { editorCopy } from './copy';

/**
 * Guardar el optimizador en la cuenta
 * ===================================
 * Hay DOS guardados en el sistema y este hook es solo el segundo:
 *
 *  1. El del navegador, automatico. Cada edicion escribe en IndexedDB. No pide
 *     cuenta, no sale de la maquina y es lo que hace que cerrar la pestaña no
 *     cueste nada.
 *  2. El de la cuenta, a boton, que es esto. Sube la plantilla a Supabase, bajo
 *     el `author_id` de quien tiene la sesion, y por eso exige sesion: la
 *     politica RLS cuelga de `auth.uid()` y sin ella el insert no tiene dueño
 *     a quien pertenecer.
 *
 * Lo que sube es la plantilla y nada mas. Los objetos del jugador no viajan;
 * ver `OptimizerDraft`, que no tiene por donde recibirlos.
 *
 * El vinculo con la fila remota se guarda en la fila local (`remoteId`). Sin
 * el, cada clic insertaria un optimizador nuevo, porque el id local es un slug
 * y el remoto un uuid y no hay forma de reconocer que son el mismo.
 */

/** Si se puede guardar, y si no, por que no. */
export type SaveAvailability = 'unavailable' | 'loading' | 'needsSession' | 'ready';

export type SavePhase = 'idle' | 'saving' | 'saved' | 'failed';

/** Lo que ya existe en la nube para este optimizador. */
export interface RemoteLink {
  remoteId: string;
  shared: boolean;
}

export interface UseSaveOptimizerResult {
  availability: SaveAvailability;
  phase: SavePhase;
  /** El vinculo con la nube, o null si todavia no se guardo nunca. */
  link: RemoteLink | null;
  /** Mensaje de la copia cuando algo falla. */
  error: string | null;
  /** El detalle tecnico, para no dejar al autor adivinando. */
  detail: string | null;
  /** Manda a iniciar sesion y recuerda donde estaba. */
  goSignIn: () => void;
  save: (shared: boolean) => Promise<void>;
}

const detailOf = (error: unknown): string | null => {
  if (error instanceof DataAccessError) return error.message;
  if (error instanceof Error) return error.message;
  return null;
};

export function useSaveOptimizer(
  template: GameTemplate | undefined,
): UseSaveOptimizerResult {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const gameId = template?.gameId;
  const [link, setLink] = useState<RemoteLink | null>(null);
  /**
   * De donde salio este borrador, si salio de un optimizador del catalogo. Solo
   * sirve si es un uuid: la clave foranea apunta a `optimizers`, y un id local
   * no existe en Postgres.
   */
  const [origin, setOrigin] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<SavePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLink(null);
      setOrigin(undefined);
      return;
    }

    let alive = true;
    getGameRepository()
      .get(gameId)
      .then((row) => {
        if (!alive) return;
        setLink(
          row?.remoteId ? { remoteId: row.remoteId, shared: row.shared === true } : null,
        );
        setOrigin(row?.forkedFrom && isUuid(row.forkedFrom) ? row.forkedFrom : undefined);
      })
      .catch(() => {
        // Sin IndexedDB no se sabe si ya estaba guardado. Se trata como que no:
        // peor es bloquear el boton por no poder leer una cache.
        if (alive) setLink(null);
      });

    return () => {
      alive = false;
    };
  }, [gameId]);

  const availability: SaveAvailability =
    status === 'unconfigured'
      ? 'unavailable'
      : status === 'loading'
        ? 'loading'
        : status === 'anonymous'
          ? 'needsSession'
          : 'ready';

  const goSignIn = useCallback(() => {
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
  }, [navigate, location.pathname]);

  const save = useCallback(
    async (shared: boolean) => {
      // La guarda vive aqui y no solo en el boton: un atajo de teclado o una
      // prueba pueden llamar a `save` sin pasar por el.
      if (!template || availability !== 'ready') return;

      setPhase('saving');
      setError(null);
      setDetail(null);

      const draft: OptimizerDraft = {
        template,
        shared,
        ...(link ? {} : origin ? { forkedFrom: origin } : {}),
      };

      try {
        const optimizers = getOptimizerRepository();
        let remoteId = link?.remoteId;

        if (remoteId) {
          await optimizers.updateOptimizer(remoteId, draft);
        } else {
          remoteId = await optimizers.createOptimizer(draft);
        }

        // El vinculo se escribe DESPUES de que la nube confirme. Al contrario,
        // un fallo de red dejaria un remoteId que no existe y el guardado
        // siguiente intentaria actualizar una fila fantasma.
        await getGameRepository().save({
          id: template.gameId,
          template,
          remoteId,
          shared,
        });

        setLink({ remoteId, shared });
        setPhase('saved');
      } catch (cause) {
        setError(editorCopy.save.failed);
        setDetail(detailOf(cause));
        setPhase('failed');
      }
    },
    [template, availability, link, origin],
  );

  return { availability, phase, link, error, detail, goSignIn, save };
}
