import { useCallback, useEffect, useState } from 'react';

import type { BaseProfile } from '@zenith/shared-types';

import { getProfileBaseRepository } from './repositories';

interface ProfileBaseState {
  profileId: string;
  base: Record<string, number>;
  ready: boolean;
}

export interface UseProfileBaseResult {
  base: Record<string, number>;
  save: (base: Record<string, number>) => Promise<void>;
  /** `true` cuando ya se mezclo la base guardada del jugador (o se sabe que no hay). */
  ready: boolean;
}

/**
 * Base efectiva de un perfil: la de la plantilla, salvo que el jugador haya
 * subido de nivel. El cambio se guarda en Dexie, no en la plantilla publicada.
 *
 * `ready` existe para que la pantalla no dispare una busqueda con la base de la
 * plantilla mientras la lectura de Dexie todavia esta en vuelo: lo que se ve
 * tiene que ser lo que se calcula.
 */
export function useProfileBase(
  gameId: string | undefined,
  profile: BaseProfile | undefined,
): UseProfileBaseResult {
  const [state, setState] = useState<ProfileBaseState | null>(null);

  useEffect(() => {
    if (!gameId || !profile) {
      setState(null);
      return;
    }

    let alive = true;
    setState({ profileId: profile.id, base: profile.base, ready: false });

    getProfileBaseRepository()
      .get(gameId, profile.id)
      .then((saved) => {
        if (!alive) return;
        // Solo se aplica si el estado sigue sin resolver: un `save` puede llegar
        // antes que esta lectura y no debe quedar pisado por la base publicada.
        setState((prev) =>
          prev && prev.profileId === profile.id && !prev.ready
            ? {
                profileId: profile.id,
                base: saved ? { ...profile.base, ...saved } : profile.base,
                ready: true,
              }
            : prev,
        );
      })
      .catch(() => {
        if (!alive) return;
        setState((prev) =>
          prev && prev.profileId === profile.id && !prev.ready
            ? { profileId: profile.id, base: profile.base, ready: true }
            : prev,
        );
      });

    return () => {
      alive = false;
    };
  }, [gameId, profile]);

  const save = useCallback(
    async (base: Record<string, number>) => {
      if (!gameId || !profile) return;
      setState({ profileId: profile.id, base, ready: true });
      await getProfileBaseRepository().save(gameId, profile.id, base);
    },
    [gameId, profile],
  );

  const base =
    state && state.profileId === profile?.id ? state.base : (profile?.base ?? {});
  const ready = state !== null && state.profileId === profile?.id ? state.ready : false;

  return { base, save, ready };
}
