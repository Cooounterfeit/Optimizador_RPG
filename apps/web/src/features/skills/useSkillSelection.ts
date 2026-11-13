import { useCallback, useEffect, useState } from 'react';

import { sanitizeSelection } from '@zenith/core-engine';
import type { GameTemplate, SkillSelection } from '@zenith/shared-types';

import { getSkillsRepository } from '../game/repositories';

export type SkillSelectionStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Carga y guarda la seleccion de habilidades del juego activo.
 *
 * La seleccion vive en Dexie (`skills`), no en Supabase: es estado del jugador.
 * Al cargar se sanea contra la plantilla actual para que un arbol editado no
 * deje referencias rotas.
 */
export function useSkillSelection(template: GameTemplate | undefined) {
  const [selection, setSelection] = useState<SkillSelection>({});
  const [status, setStatus] = useState<SkillSelectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const gameId = template?.gameId;

  useEffect(() => {
    if (!template || !gameId) {
      setSelection({});
      setStatus('idle');
      return;
    }

    let alive = true;
    setStatus('loading');
    setError(null);

    getSkillsRepository()
      .load(gameId)
      .then((saved) => {
        if (!alive) return;
        setSelection(sanitizeSelection(template, saved));
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Could not load the skill selection.');
      });

    return () => {
      alive = false;
    };
  }, [gameId, template]);

  const save = useCallback(
    async (next: SkillSelection) => {
      if (!template) return;
      const clean = sanitizeSelection(template, next);
      setSelection(clean);
      setError(null);
      try {
        await getSkillsRepository().save(template.gameId, clean);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not save the skill selection.');
      }
    },
    [template],
  );

  return { selection, save, status, error };
}
