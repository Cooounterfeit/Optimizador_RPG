import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../../components/ui/Button';
import { getGameRepository, getInventoryRepository } from '../../game/repositories';
import { copy } from '../copy';
import type { Draft } from '../useDrafts';

/**
 * Tus borradores, arriba del catalogo
 * ===================================
 * Solo aparece si tienes alguno: a quien nunca creo uno no le dice nada y no
 * deberia ocupar sitio.
 *
 * El borrado pregunta siempre, y con numeros. No es solo quitar la plantilla:
 * `clearLocalData` se lleva tambien el inventario de ese juego, el equipo
 * puesto, el historial de niveles, las habilidades elegidas y las imagenes. Eso
 * pueden ser horas de trabajo del autor y no hay deshacer, asi que la
 * confirmacion dice cuantas piezas se van antes de tocarlas.
 */

export function DraftsRail({ drafts }: { drafts: Draft[] }) {
  const [confirming, setConfirming] = useState<{ id: string; items: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (drafts.length === 0) return null;

  const ask = async (draft: Draft) => {
    setError(null);
    let items = 0;
    try {
      items = (await getInventoryRepository().getAll(draft.id)).length;
    } catch {
      // Sin cuenta de piezas se pregunta igual: no saber cuantas son no es
      // razon para borrar sin preguntar.
      items = 0;
    }
    setConfirming({ id: draft.id, items });
  };

  const remove = async (id: string) => {
    setPending(true);
    setError(null);
    try {
      const games = getGameRepository();
      // El orden importa poco, pero primero lo pesado: si falla a medias, la
      // ficha sigue ahi y se puede reintentar.
      await games.clearLocalData(id);
      await games.remove(id);
      setConfirming(null);
    } catch {
      setError(copy.drafts.deleteFailed);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mb-8 border-b border-line pb-6" aria-labelledby="drafts-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="m-0 text-lg font-bold tracking-[-0.025em]" id="drafts-title">
          {copy.drafts.title}
        </h2>
        <p className="m-0 font-mono text-[10px] text-muted-foreground">{copy.drafts.note}</p>
      </div>

      {error ? (
        <p className="mb-3 text-[13px] text-[oklch(0.78_0.16_25)]" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {drafts.map((draft) =>
          confirming?.id === draft.id ? (
            <li
              key={draft.id}
              className="border-l-2 border-l-[oklch(0.68_0.15_25)] bg-card px-3 py-3"
            >
              <p className="m-0 text-[13px]">
                {copy.drafts.deleteAsk.replace('{name}', draft.name)}
              </p>
              <p className="m-0 mt-1 text-[12px] text-muted-foreground">
                {confirming.items > 0
                  ? copy.drafts.deleteWithItems.replace('{n}', String(confirming.items))
                  : copy.drafts.deleteNoItems}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void remove(draft.id)}
                >
                  {copy.drafts.deleteConfirm}
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {copy.drafts.cancel}
                </button>
              </div>
            </li>
          ) : (
            <li key={draft.id} className="flex min-w-0 items-stretch gap-2">
              <Link
                to={`/optimizer/${draft.id}/configuracion`}
                className="flex min-w-0 flex-1 items-baseline gap-3 rounded-[2px] border border-line px-3 py-2.5 transition-colors hover:border-line-strong"
              >
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                  {draft.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {draft.id}
                </span>
              </Link>
              <button
                type="button"
                aria-label={`${copy.drafts.delete} ${draft.name}`}
                onClick={() => void ask(draft)}
                className="rounded-[2px] border border-line px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
              >
                {copy.drafts.delete}
              </button>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
