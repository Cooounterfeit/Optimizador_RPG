import { useEffect, useState } from 'react';

import { onGamesChanged } from '@zenith/data-access';

import { getGameRepository } from '../game/repositories';

/**
 * Los optimizadores que viven solo en este navegador
 * ==================================================
 * Sin esto no habia forma de volver a un borrador. Se creaba, se entraba, y al
 * salir desaparecia de la vista: seguia en IndexedDB, pero no lo listaba nadie
 * y solo se llegaba escribiendo la URL de memoria.
 *
 * Se filtra por `cloud`. El cache guarda TODO lo que se abre, incluidos los
 * optimizadores del catalogo, y listarlos aqui diria que son tuyos cuando solo
 * los miraste.
 *
 * Escucha los cambios del repositorio para no depender de recargar: crear un
 * optimizador y volver atras tiene que mostrarlo, que es lo que pide CFG-05.
 */

export interface Draft {
  id: string;
  name: string;
  updatedAt: number;
  /**
   * La fila de Supabase, si el borrador ya se guardo en la cuenta. Viaja hasta
   * la tarjeta porque sin esto la portada no puede decir la verdad: desde que
   * hay boton de guardar, "solo en este navegador" dejo de valer para todos.
   */
  remoteId?: string;
  /** Si esa copia esta en el catalogo de la comunidad. */
  shared: boolean;
}

export function useDrafts(): Draft[] | null {
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  useEffect(() => {
    let alive = true;

    const read = () => {
      getGameRepository()
        .list()
        .then((rows) => {
          if (!alive) return;
          setDrafts(
            rows
              .filter((row) => !row.cloud)
              .map((row) => ({
                id: row.id,
                name: row.template.name || row.id,
                updatedAt: row.updatedAt,
                remoteId: row.remoteId,
                shared: row.shared === true,
              })),
          );
        })
        .catch(() => {
          // Sin borradores que mostrar no se rompe la portada: el catalogo es
          // lo principal y esto es un anexo.
          if (alive) setDrafts([]);
        });
    };

    read();
    const stop = onGamesChanged(read);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  return drafts;
}
