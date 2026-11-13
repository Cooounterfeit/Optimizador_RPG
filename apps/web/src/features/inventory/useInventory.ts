import { useCallback, useEffect, useRef, useState } from 'react';

import { onInventoryChanged } from '@zenith/data-access';
import type { Item } from '@zenith/shared-types';

import { inventoryCopy } from './copy';
import { getInventoryRepository } from '../game/repositories';

export interface UseInventoryResult {
  items: Item[] | null;
  /**
   * Juego al que pertenece la lista ya leida. `null` mientras se lee o cuando
   * no hay juego. Sirve para no confundir un `[]` transitorio (juego todavia
   * sin resolver) con un inventario vacio de verdad.
   */
  loadedFor: string | null;
  error: string | null;
  reload: () => Promise<void>;
  add: (item: Item) => Promise<void>;
  update: (item: Item) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const messageOf = (cause: unknown): string =>
  cause instanceof Error && cause.message ? cause.message : inventoryCopy.errors.unknown;

/**
 * Inventario del juego activo. Se suscribe al emisor de `data-access` para que
 * cualquier escritura (de esta pantalla o de otra) refresque la lista.
 */
export function useInventory(gameId: string | undefined): UseInventoryResult {
  const [items, setItems] = useState<Item[] | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Numero de la ultima lectura pedida: una respuesta vieja no pisa a la nueva. */
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const mine = (requestId.current += 1);

    if (!gameId) {
      setItems([]);
      setLoadedFor(null);
      setError(null);
      return;
    }

    try {
      const list = await getInventoryRepository().getAll(gameId);
      if (mine !== requestId.current) return;
      setItems(list);
      setLoadedFor(gameId);
      setError(null);
    } catch (cause) {
      if (mine !== requestId.current) return;
      setError(messageOf(cause));
    }
  }, [gameId]);

  useEffect(() => {
    setItems(null);
    setLoadedFor(null);
    setError(null);
    void reload();

    return onInventoryChanged((changed) => {
      if (changed === gameId) void reload();
    });
  }, [gameId, reload]);

  const add = async (item: Item) => {
    if (!gameId) return;
    await getInventoryRepository().addItem(item, gameId);
    await reload();
  };

  const update = async (item: Item) => {
    if (!gameId) return;
    await getInventoryRepository().updateItem(item, gameId);
    await reload();
  };

  const remove = async (id: string) => {
    await getInventoryRepository().removeItem(id);
    await reload();
  };

  return { items, loadedFor, error, reload, add, update, remove };
}
