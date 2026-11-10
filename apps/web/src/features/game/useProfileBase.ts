import { useCallback, useEffect, useState } from 'react';

import type { BaseProfile } from '@zenith/shared-types';

import { getProfileBaseRepository } from './repositories';

interface ProfileBaseState {
  profileId: string;
  base: Record<string, number>;
}

export interface UseProfileBaseResult {
  base: Record<string, number>;
  save: (base: Record<string, number>) => Promise<void>;
}

/**
 * Base efectiva de un perfil: la de la plantilla, salvo que el jugador haya
 * subido de nivel. El cambio se guarda en Dexie, no en la plantilla publicada.
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
    setState({ profileId: profile.id, base: profile.base });

    getProfileBaseRepository()
      .get(gameId, profile.id)
      .then((saved) => {
        if (alive && saved) {
          setState({ profileId: profile.id, base: { ...profile.base, ...saved } });
        }
      })
      .catch(() => {
        if (alive) setState({ profileId: profile.id, base: profile.base });
      });

    return () => {
      alive = false;
    };
  }, [gameId, profile]);

  const save = useCallback(
    async (base: Record<string, number>) => {
      if (!gameId || !profile) return;
      setState({ profileId: profile.id, base });
      await getProfileBaseRepository().save(gameId, profile.id, base);
    },
    [gameId, profile],
  );

  const base =
    state && state.profileId === profile?.id ? state.base : (profile?.base ?? {});

  return { base, save };
}
