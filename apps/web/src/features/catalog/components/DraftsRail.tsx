import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../../components/ui/Button';
import { fieldClass } from '../../../components/ui/form';
import { nameProblem } from '../../editor/name-rules';
import { slugify, uniqueGameId } from '../../editor/skeleton';
import { getGameRepository, getInventoryRepository } from '../../game/repositories';
import { getOptimizerRepository } from '../../optimizer/optimizer-repository';
import { copy } from '../copy';
import type { Draft } from '../useDrafts';

import { DraftMenu } from './DraftMenu';

/**
 * Tus borradores, arriba del catalogo
 * ===================================
 * Solo aparece si tienes alguno: a quien nunca creo uno no le dice nada y no
 * deberia ocupar sitio.
 *
 * Desde que hay boton de guardar, un borrador puede vivir en DOS sitios, y la
 * tarjeta tiene que decir en cual: solo aqui, en tu cuenta, o compartido. Antes
 * la seccion afirmaba "solo en este navegador" para todos, y eso dejo de ser
 * cierto el dia que se pudo subir.
 *
 * Las acciones tienen cada una su trampa, y conviene dejarlas escritas:
 *
 * RENOMBRAR cambia el nombre visible y NO el id. Es la misma regla que en los
 * atributos: el id viaja dentro de la plantilla y en las claves del inventario,
 * y cambiarlo dejaria las piezas apuntando a un juego que ya no existe.
 *
 * COPIAR se lleva tambien el inventario. Una copia que llegue vacia no es una
 * copia, es una plantilla nueva, y no es lo que alguien espera al duplicar algo
 * en lo que lleva horas. Queda registrada como copia con `forkedFrom`.
 *
 * QUITAR DE LA CUENTA borra la fila de Supabase y conserva el borrador. Son dos
 * guardados distintos y quitar uno no tiene por que llevarse el otro.
 *
 * BORRAR si se lleva las dos cosas, y lo dice antes. Borrar solo lo local
 * dejaria en la nube una fila que ya nadie puede alcanzar, porque el vinculo
 * vivia precisamente en la fila local que se acaba de borrar.
 */

type Mode =
  | { id: string; kind: 'rename' }
  | { id: string; kind: 'delete'; items: number }
  | { id: string; kind: 'unsave' };

export function DraftsRail({ drafts }: { drafts: Draft[] }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (drafts.length === 0) return null;

  const startRename = (draft: Draft) => {
    setError(null);
    setDraftName(draft.name);
    setMode({ id: draft.id, kind: 'rename' });
  };

  const askDelete = async (draft: Draft) => {
    setError(null);
    let items = 0;
    try {
      items = (await getInventoryRepository().getAll(draft.id)).length;
    } catch {
      // Sin la cuenta se pregunta igual: no saber cuantas son no es razon para
      // borrar sin preguntar.
      items = 0;
    }
    setMode({ id: draft.id, kind: 'delete', items });
  };

  const rename = async (event: FormEvent<HTMLFormElement>, draft: Draft) => {
    event.preventDefault();
    const problem = nameProblem(draftName, {
      taken: drafts.filter((other) => other.id !== draft.id).map((other) => other.name),
    });
    if (problem) {
      setError(copy.drafts.renameFailed);
      return;
    }

    setPending(true);
    try {
      const games = getGameRepository();
      const row = await games.get(draft.id);
      if (!row) throw new Error('el borrador ya no existe');
      // El id de la plantilla no se toca: lo usan las claves del inventario.
      await games.save({ id: row.id, template: { ...row.template, name: draftName.trim() } });
      setMode(null);
    } catch {
      setError(copy.drafts.renameFailed);
    } finally {
      setPending(false);
    }
  };

  const duplicate = async (draft: Draft) => {
    setError(null);
    setPending(true);
    try {
      const games = getGameRepository();
      const row = await games.get(draft.id);
      if (!row) throw new Error('el borrador ya no existe');

      const name = `${row.template.name} (${copy.drafts.copySuffix})`;
      const taken = (await games.list()).map((entry) => entry.id);
      const id = uniqueGameId(slugify(name), taken);

      // La copia nace local: no hereda el vinculo con la cuenta del original,
      // o guardar la copia pisaria el optimizador del que salio.
      await games.save({
        id,
        template: { ...row.template, gameId: id, name },
        forkedFrom: draft.id,
      });

      // Y las piezas, que es lo que hace que sea una copia y no un juego nuevo.
      const inventory = getInventoryRepository();
      for (const item of await inventory.getAll(draft.id)) {
        await inventory.addItem(item, id);
      }
    } catch {
      setError(copy.drafts.duplicateFailed);
    } finally {
      setPending(false);
    }
  };

  const unsave = async (draft: Draft) => {
    if (!draft.remoteId) return;
    setPending(true);
    setError(null);
    try {
      await getOptimizerRepository().deleteOptimizer(draft.remoteId);
      await getGameRepository().unlinkRemote(draft.id);
      setMode(null);
    } catch {
      setError(copy.drafts.unsaveFailed);
    } finally {
      setPending(false);
    }
  };

  const remove = async (draft: Draft) => {
    setPending(true);
    setError(null);
    try {
      const games = getGameRepository();
      // La nube primero. Si falla, el borrador sigue aqui con su vinculo y se
      // puede reintentar; al reves quedaria una fila inalcanzable.
      if (draft.remoteId) await getOptimizerRepository().deleteOptimizer(draft.remoteId);
      await games.clearLocalData(draft.id);
      await games.remove(draft.id);
      setMode(null);
    } catch {
      setError(copy.drafts.deleteFailed);
    } finally {
      setPending(false);
    }
  };

  const cancelar = (
    <button
      type="button"
      onClick={() => setMode(null)}
      className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
    >
      {copy.drafts.cancel}
    </button>
  );

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
        {drafts.map((draft) => {
          const active = mode?.id === draft.id ? mode : null;

          if (active?.kind === 'rename') {
            return (
              <li key={draft.id}>
                <form
                  onSubmit={(event) => void rename(event, draft)}
                  noValidate
                  className="rounded-[2px] border border-line-strong bg-card px-3 py-2.5"
                >
                  <label className="sr-only" htmlFor={`rename-${draft.id}`}>
                    {copy.drafts.renameLabel}
                  </label>
                  <input
                    id={`rename-${draft.id}`}
                    className={fieldClass}
                    type="text"
                    autoFocus
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <Button type="submit" variant="outline" disabled={pending}>
                      {copy.drafts.save}
                    </Button>
                    {cancelar}
                  </div>
                </form>
              </li>
            );
          }

          if (active?.kind === 'unsave') {
            return (
              <li
                key={draft.id}
                className="rounded-[2px] border-l-2 border-l-border-strong bg-card px-3 py-3"
              >
                <p className="m-0 text-[13px]">
                  {copy.drafts.unsaveAsk.replace('{name}', draft.name)}
                </p>
                <p className="m-0 mt-1 text-[12px] text-muted-foreground">
                  {draft.shared ? copy.drafts.unsaveShared : copy.drafts.unsavePrivate}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void unsave(draft)}
                  >
                    {copy.drafts.unsaveConfirm}
                  </Button>
                  {cancelar}
                </div>
              </li>
            );
          }

          if (active?.kind === 'delete') {
            return (
              <li
                key={draft.id}
                className="rounded-[2px] border-l-2 border-l-[oklch(0.68_0.15_25)] bg-card px-3 py-3"
              >
                <p className="m-0 text-[13px]">
                  {copy.drafts.deleteAsk.replace('{name}', draft.name)}
                </p>
                <p className="m-0 mt-1 text-[12px] text-muted-foreground">
                  {active.items > 0
                    ? copy.drafts.deleteWithItems.replace('{n}', String(active.items))
                    : copy.drafts.deleteNoItems}
                </p>
                {draft.remoteId ? (
                  <p className="m-0 mt-1 text-[12px] text-muted-foreground">
                    {draft.shared ? copy.drafts.deleteAlsoShared : copy.drafts.deleteAlsoAccount}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void remove(draft)}
                  >
                    {copy.drafts.deleteConfirm}
                  </Button>
                  {cancelar}
                </div>
              </li>
            );
          }

          return (
            <li
              key={draft.id}
              className="flex min-w-0 items-center gap-2 rounded-[2px] border border-line pe-1.5 ps-3 transition-colors hover:border-line-strong"
            >
              <Link
                to={`/optimizer/${draft.id}/configuracion`}
                className="flex min-w-0 flex-1 items-baseline gap-3 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                  {draft.name}
                </span>
                {/* El estado manda sobre el id: donde vive el borrador importa
                    mas que su slug, y los dos juntos no caben. */}
                {draft.remoteId ? (
                  <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {draft.shared ? copy.drafts.sharedTag : copy.drafts.inAccount}
                  </span>
                ) : (
                  <span className="hidden min-w-0 max-w-[45%] shrink truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground sm:block">
                    {draft.id}
                  </span>
                )}
              </Link>
              <DraftMenu
                forName={draft.name}
                actions={[
                  {
                    id: 'rename',
                    label: copy.drafts.rename,
                    onSelect: () => startRename(draft),
                  },
                  {
                    id: 'duplicate',
                    label: copy.drafts.duplicate,
                    onSelect: () => void duplicate(draft),
                  },
                  ...(draft.remoteId
                    ? [
                        {
                          id: 'unsave',
                          label: copy.drafts.unsave,
                          onSelect: () => {
                            setError(null);
                            setMode({ id: draft.id, kind: 'unsave' as const });
                          },
                        },
                      ]
                    : []),
                  {
                    id: 'delete',
                    label: copy.drafts.delete,
                    danger: true,
                    onSelect: () => void askDelete(draft),
                  },
                ]}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
