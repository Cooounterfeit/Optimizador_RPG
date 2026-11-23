import { useEffect, useMemo, useRef, useState } from 'react';

import { removeStat, statReferences } from '@zenith/core-engine';

import { Button } from '../../components/ui/Button';
import { errorClass } from '../../components/ui/form';
import { useOptimizerWorkspace } from '../optimizer/workspace/OptimizerWorkspaceProvider';

import { missingRequired } from './blocks';
import { editorCopy } from './copy';

/**
 * Eliminar un atributo base (CFG-04)
 * ==================================
 * Dos caminos, como pide el criterio. Si no lo usa nadie se borra directo, sin
 * preguntar. Si lo usa algo, se enseña exactamente qué va a desaparecer y hay
 * que confirmarlo.
 *
 * El borrado directo ocurre al montar, que es lo que hace que el primer clic
 * baste. Es seguro repetirlo: `removeStat` sobre un id que ya no está devuelve
 * la misma plantilla, y hay una prueba que lo fija.
 *
 * Lo que se enseña no es un conteo: es la lista de lo que se va entero y la de
 * lo que solo pierde este valor. La diferencia importa, porque un objetivo que
 * desaparece no se recupera y un conjunto que pierde un efecto sí se vuelve a
 * poner a mano.
 *
 * Y lo que el criterio no pedía pero hace falta: si tras el borrado el
 * optimizador deja de poder buscar, se dice ANTES. No se bloquea, porque la
 * plantilla es del autor; pero borrar su único objetivo sin avisar sería dejar
 * que se rompa el juego de lado.
 */

interface StatDeleteRowProps {
  id: string;
  onDone: (message?: string) => void;
}

export function StatDeleteRow({ id, onDone }: StatDeleteRowProps) {
  const { template, saveTemplate, inventory } = useOptimizerWorkspace();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Para no disparar el borrado directo dos veces en el mismo montaje. */
  const fired = useRef(false);

  const items = inventory.items ?? [];

  const plan = useMemo(() => {
    if (!template) return null;
    const { refs } = statReferences(template, id, items);
    const after = removeStat(template, id);

    /** Los que estaban antes y ya no estan despues. */
    const disappeared = <T extends { id: string; name: string }>(
      before: readonly T[],
      after: readonly T[],
    ): T[] => before.filter((entry) => !after.some((other) => other.id === entry.id));

    return {
      refs,
      after,
      /** Lo que desaparece por completo, con su tipo para poder nombrarlo. */
      removed: [
        ...disappeared(template.objectives, after.objectives).map((entry) => ({
          kind: editorCopy.stats.kindObjective,
          name: entry.name,
        })),
        ...disappeared(template.derived, after.derived).map((entry) => ({
          kind: editorCopy.stats.kindDerived,
          name: entry.name,
        })),
      ],
      /** Lo que se queda pero pierde este valor. */
      touched: refs.filter((ref) => ref.kind !== 'objective' && ref.kind !== 'derived'),
      /** Partes obligatorias que quedarían vacías. */
      breaks: missingRequired(after)
        .map((block) => block.label)
        .filter((label) => !missingRequired(template).some((before) => before.label === label)),
    };
  }, [template, id, items]);

  const inUse = (plan?.refs.length ?? 0) > 0;

  useEffect(() => {
    if (!template || !plan || inUse || fired.current) return;
    fired.current = true;
    saveTemplate(plan.after)
      .then(() => onDone(editorCopy.stats.deleted))
      .catch(() => setError(editorCopy.stats.deleteFailed));
    // Solo al montar: si no lo usa nadie, el primer clic ya borra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!template || !plan) return null;

  const stat = template.stats.find((entry) => entry.id === id);
  if (!stat) return null;

  // Sin uso: el efecto de arriba ya está borrando, no hay nada que preguntar.
  if (!inUse) {
    return (
      <p className="px-1 py-2.5 text-[13px] text-muted-foreground" role="status">
        {error ?? editorCopy.stats.deletingNow}
      </p>
    );
  }

  const confirm = async () => {
    setPending(true);
    try {
      await saveTemplate(plan.after);
      onDone(editorCopy.stats.deletedCascade);
    } catch {
      setError(editorCopy.stats.deleteFailed);
      setPending(false);
    }
  };

  return (
    <div className="border-l-2 border-l-[oklch(0.68_0.15_25)] bg-card px-4 py-4">
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}

      <p className="m-0 text-sm font-semibold">
        {editorCopy.stats.deleteTitle.replace('{name}', stat.name)}
      </p>
      <p className="m-0 mt-1 text-[13px] text-muted-foreground">
        {editorCopy.stats.deleteIntro.replace('{n}', String(plan.refs.length))}
      </p>

      {plan.removed.length > 0 ? (
        <>
          <p className="label-caps mt-4 m-0">{editorCopy.stats.deleteGone}</p>
          <ul className="mt-1.5 space-y-1">
            {plan.removed.map((entry) => (
              <li key={`${entry.kind}:${entry.name}`} className="text-[13px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {entry.kind}
                </span>{' '}
                {entry.name}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {plan.touched.length > 0 ? (
        <>
          <p className="label-caps mt-4 m-0">{editorCopy.stats.deleteKept}</p>
          <ul className="mt-1.5 space-y-1">
            {plan.touched.map((ref) => (
              <li key={`${ref.kind}:${ref.where}`} className="text-[13px] text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em]">{ref.kind}</span>{' '}
                {ref.label}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {plan.breaks.length > 0 ? (
        <p
          className="mt-4 border-l-2 border-l-[oklch(0.80_0.11_72)] bg-raised px-4 py-3 text-[13px]"
          role="alert"
        >
          {editorCopy.stats.deleteBreaks.replace('{parts}', plan.breaks.join(', '))}
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Button type="button" variant="outline" onClick={() => void confirm()} disabled={pending}>
          {editorCopy.stats.deleteConfirm}
        </Button>
        <button
          type="button"
          onClick={() => onDone()}
          className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {editorCopy.stats.cancel}
        </button>
      </div>
    </div>
  );
}
