import { useCallback, useEffect, useState } from 'react';

import type { Equipment } from '@zenith/shared-types';

import { getEquipmentRepository } from './repositories';

interface EquipmentState {
  gameId: string;
  profileId: string;
  slots: Equipment;
  ready: boolean;
}

export interface UseEquipmentResult {
  equipment: Equipment;
  save: (slots: Equipment) => Promise<void>;
  /** `true` cuando ya se leyo el equipo guardado (o se sabe que no hay). */
  ready: boolean;
}

/** Equipo vacio estable: identidad fija para no reescribir el efecto que lo consume. */
const NO_EQUIPMENT: Equipment = {};

/**
 * Equipo puesto de un personaje. Vive en Dexie: es estado del jugador, no de la
 * plantilla publicada. Se guardan las ranuras (ranura -> id, '' = vacia); los
 * totales y el puntaje se recalculan con las reglas vigentes.
 *
 * `ready` existe para que la pantalla no compare una build contra un equipo que
 * todavia se esta leyendo.
 */
export function useEquipment(
  gameId: string | undefined,
  profileId: string | undefined,
): UseEquipmentResult {
  const [state, setState] = useState<EquipmentState | null>(null);

  useEffect(() => {
    if (!gameId || !profileId) {
      setState(null);
      return;
    }

    let alive = true;
    setState({ gameId, profileId, slots: {}, ready: false });

    getEquipmentRepository()
      .get(gameId, profileId)
      .then((saved) => {
        if (!alive) return;
        // Solo se aplica si sigue sin resolver: un `save` puede llegar antes que
        // esta lectura y no debe quedar pisado por lo guardado anteriormente.
        setState((prev) =>
          prev && prev.gameId === gameId && prev.profileId === profileId && !prev.ready
            ? { gameId, profileId, slots: saved, ready: true }
            : prev,
        );
      })
      .catch(() => {
        if (!alive) return;
        setState((prev) =>
          prev && prev.gameId === gameId && prev.profileId === profileId && !prev.ready
            ? { gameId, profileId, slots: {}, ready: true }
            : prev,
        );
      });

    return () => {
      alive = false;
    };
  }, [gameId, profileId]);

  const save = useCallback(
    async (slots: Equipment) => {
      if (!gameId || !profileId) return;
      setState({ gameId, profileId, slots: { ...slots }, ready: true });
      await getEquipmentRepository().save(gameId, profileId, slots);
    },
    [gameId, profileId],
  );

  const matches = state !== null && state.gameId === gameId && state.profileId === profileId;
  const equipment = matches ? state.slots : NO_EQUIPMENT;
  const ready = matches ? state.ready : false;

  return { equipment, save, ready };
}
