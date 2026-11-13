import { useCallback, useEffect, useRef, useState } from 'react';

import type { Equipment, Item } from '@zenith/shared-types';

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
 *
 * Con `items` se descartan las piezas que ya no existen en el inventario: si el
 * jugador borra un objeto, su ranura no puede seguir apuntando a el. `null` (o
 * ausente) significa "inventario todavia desconocido" y no limpia nada.
 */
export function useEquipment(
  gameId: string | undefined,
  profileId: string | undefined,
  items?: Item[] | null,
): UseEquipmentResult {
  const [state, setState] = useState<EquipmentState | null>(null);
  const cleanedFor = useRef<{ gameId: string; profileId: string; items: Item[] } | null>(null);
  /** Escrituras del jugador: una lectura que empezo antes no puede pisarlas. */
  const writes = useRef(0);

  useEffect(() => {
    if (!gameId || !profileId) {
      setState(null);
      cleanedFor.current = null;
      return;
    }

    let alive = true;
    const mine = writes.current;
    setState({ gameId, profileId, slots: {}, ready: false });

    getEquipmentRepository()
      .get(gameId, profileId)
      .then((saved) => {
        if (!alive || writes.current !== mine) return;
        setState({ gameId, profileId, slots: saved, ready: true });
      })
      .catch(() => {
        if (!alive || writes.current !== mine) return;
        setState({ gameId, profileId, slots: {}, ready: true });
      });

    return () => {
      alive = false;
    };
  }, [gameId, profileId]);

  const save = useCallback(
    async (slots: Equipment) => {
      if (!gameId || !profileId) return;
      writes.current += 1;
      setState({ gameId, profileId, slots: { ...slots }, ready: true });
      await getEquipmentRepository().save(gameId, profileId, slots);
    },
    [gameId, profileId],
  );

  const matches = state !== null && state.gameId === gameId && state.profileId === profileId;
  const equipment = matches ? state.slots : NO_EQUIPMENT;
  const ready = matches ? state.ready : false;

  useEffect(() => {
    if (!gameId || !profileId || !items || !ready) return;

    const last = cleanedFor.current;
    if (last && last.gameId === gameId && last.profileId === profileId && last.items === items) {
      return;
    }

    const known = new Set(items.map((item) => item.id));
    const cleaned: Equipment = {};
    let removed = false;
    for (const [slotId, itemId] of Object.entries(equipment)) {
      if (itemId === '' || known.has(itemId)) cleaned[slotId] = itemId;
      else removed = true;
    }
    if (!removed) return;

    cleanedFor.current = { gameId, profileId, items };
    setState({ gameId, profileId, slots: cleaned, ready: true });
    void getEquipmentRepository().save(gameId, profileId, cleaned);
  }, [gameId, profileId, items, ready, equipment]);

  return { equipment, save, ready };
}
