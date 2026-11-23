import { useState, type FormEvent } from 'react';

import { statReferences } from '@zenith/core-engine';

import { Button } from '../../components/ui/Button';
import { errorClass } from '../../components/ui/form';
import { useOptimizerWorkspace } from '../optimizer/workspace/OptimizerWorkspaceProvider';

import { editorCopy } from './copy';
import { nameProblem, type NameProblem } from './name-rules';
import { StatFields, draftFrom, emptyDraft, statFrom, type StatDraft } from './StatFields';

/**
 * Editar un atributo base (CFG-03)
 * ================================
 * Se abre en el sitio de la fila y no al final de la lista: con cuarenta
 * atributos, un formulario que aparece abajo obliga a recordar cual se estaba
 * tocando.
 *
 * Dos cosas sobre lo que la historia pide y lo que este modelo permite.
 *
 * "Las variables que usaban el nombre antiguo se actualizan sin romper
 * referencias": aqui se cumple solo, y por un motivo distinto del que la
 * historia supone. Las formulas referencian por `id`, no por nombre, asi que
 * renombrar no toca ninguna referencia. Lo que SI romperia es cambiar el id, y
 * por eso el id no se edita.
 *
 * El aviso por reducir el rango no se puede dar, porque no hay rango. El
 * riesgo equivalente en este modelo es cambiar COMO ACUMULA una estadistica
 * que ya se usa: dos piezas con +30 pasan de dar 60 a dar 1,69, y eso cambia
 * todos los resultados sin un solo error. Ese es el que se avisa, con el
 * numero de sitios afectados y confirmacion explicita, que es la forma que
 * pedia el criterio.
 */

const MESSAGE: Record<NameProblem, string> = {
  required: editorCopy.stats.nameRequired,
  tooLong: editorCopy.stats.nameTooLong,
  badChars: editorCopy.stats.nameChars,
  taken: editorCopy.stats.nameTaken,
};

interface StatEditRowProps {
  id: string;
  onDone: () => void;
}

export function StatEditRow({ id, onDone }: StatEditRowProps) {
  const { template, saveTemplate, inventory } = useOptimizerWorkspace();
  const stat = template?.stats.find((entry) => entry.id === id);

  const [draft, setDraft] = useState<StatDraft>(() => (stat ? draftFrom(stat) : emptyDraft()));
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Cuantos sitios afecta el cambio de acumulacion, si hay que confirmarlo. */
  const [confirming, setConfirming] = useState<number | null>(null);

  if (!template || !stat) return null;

  const save = async () => {
    setPending(true);
    try {
      await saveTemplate({
        ...template,
        stats: template.stats.map((entry) =>
          entry.id === id ? statFrom(id, draft) : entry,
        ),
      });
      onDone();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : editorCopy.stats.failed);
      setPending(false);
    }
  };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!template || !stat) return;
    setError(null);

    // Los demas atributos, para no acusarse a si mismo de nombre repetido.
    const otros = template.stats.filter((entry) => entry.id !== id).map((entry) => entry.name);
    const problem = nameProblem(draft.name, { taken: otros });
    if (problem) {
      setError(MESSAGE[problem]);
      return;
    }

    const cambiaAcumulacion = draft.aggregate !== (stat.aggregate === 'multiply' ? 'multiply' : 'sum');
    if (cambiaAcumulacion && confirming === null) {
      // Con el inventario: aqui si importan las piezas, porque son las que
      // traen los valores que se van a combinar de otra forma.
      const usos = statReferences(template, id, inventory.items ?? []).refs.length;
      if (usos > 0) {
        setConfirming(usos);
        return;
      }
    }

    void save();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="border border-border-strong bg-card px-4 py-4">
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}

      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {editorCopy.stats.editing} <span className="normal-case">{stat.id}</span>
      </p>

      <StatFields
        idPrefix={`edit-${id}`}
        draft={draft}
        onChange={(next) => {
          setDraft(next);
          setConfirming(null);
        }}
        advanced={advanced}
        onToggleAdvanced={() => setAdvanced((value) => !value)}
        autoFocus
      />

      {confirming === null ? null : (
        <p
          className="mt-4 border-l-2 border-l-[oklch(0.80_0.11_72)] bg-raised px-4 py-3 text-[13px]"
          role="alert"
        >
          {editorCopy.stats.aggregateWarning.replace('{n}', String(confirming))}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {confirming === null ? editorCopy.stats.save : editorCopy.stats.saveAnyway}
        </Button>
        <button
          type="button"
          onClick={onDone}
          className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {editorCopy.stats.cancel}
        </button>
      </div>
    </form>
  );
}
