import { useCallback, useEffect, useRef, useState } from 'react';

import { onInventoryChanged } from '@zenith/data-access';
import type { Item } from '@zenith/shared-types';

import { inventoryCopy } from './copy';
import { getInventoryRepository } from '../game/repositories';

export interface UseInventoryResult {
  items: Item[] | null;
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
  const [error, setError] = useState<string | null>(null);
  /** Numero de la ultima lectura pedida: una respuesta vieja no pisa a la nueva. */
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!gameId) {
      setItems([]);
      setError(null);
      return;
    }

    const mine = (requestId.current += 1);
    try {
      const list = await getInventoryRepository().getAll(gameId);
      if (mine !== requestId.current) return;
      setItems(list);
      setError(null);
    } catch (cause) {
      if (mine !== requestId.current) return;
      setError(messageOf(cause));
    }
  }, [gameId]);

  useEffect(() => {
    setItems(null);
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

  return { items, error, reload, add, update, remove };
}
