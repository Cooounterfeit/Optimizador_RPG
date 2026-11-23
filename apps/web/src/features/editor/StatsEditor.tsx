import { useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { errorClass } from '../../components/ui/form';
import { useOptimizerWorkspace } from '../optimizer/workspace/OptimizerWorkspaceProvider';

import { editorCopy } from './copy';
import { nameProblem, type NameProblem } from './name-rules';
import { StatFields, emptyDraft, statFrom, type StatDraft } from './StatFields';
import { suggestStatId } from './stat-id';

/**
 * Crear un atributo base (CFG-01)
 * ===============================
 * El primer bloque de la plantilla que se vuelve editable. Lo que haga aqui
 * marca el patron para los seis que vienen detras.
 *
 * Dos cosas que la historia no dice y que el modelo si exige:
 *
 * La UNIDAD es obligatoria. El esquema la pide (`flat` o `percent`) y el motor
 * no puede calcular sin ella. La historia pedia en su lugar un valor minimo y
 * uno maximo, que este sistema no tiene: un tope aqui seria una constante, y
 * los topes de verdad dependen del nivel, asi que viven en `leveling` o en una
 * formula. Esa decision esta tomada y anotada.
 *
 * La ACUMULACION tampoco la pide la historia, y va igualmente. Es si dos piezas
 * con +30 dan 60 o dan 1,69. Equivocarse ahi no da un error: da numeros malos en
 * silencio. Obligar a crear primero y corregir despues seria peor que un campo
 * mas, asi que esta aqui, plegada, con su valor habitual puesto.
 *
 * El id no se pregunta. Se deriva del nombre con `suggestStatId` y se ve en el
 * listado. Hoy no hay ningun sitio en la aplicacion donde escribir una formula,
 * asi que pedirlo seria un campo obligatorio que no sirve a nadie.
 */

/** El codigo que devuelve `nameProblem`, traducido a lo que lee el usuario. */
const NAME_MESSAGE: Record<NameProblem, string> = {
  required: editorCopy.stats.nameRequired,
  tooLong: editorCopy.stats.nameTooLong,
  // Hoy no se produce: el nombre de un atributo no restringe caracteres. El
  // mensaje existe igual, porque una entrada del mapa que miente es peor que
  // una que sobra, y si manana se restringieran ya esta escrito.
  badChars: editorCopy.stats.nameChars,
  taken: editorCopy.stats.nameTaken,
};

export function StatsEditor() {
  const { template, saveTemplate } = useOptimizerWorkspace();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StatDraft>(emptyDraft);
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!template) return null;

  const reset = () => {
    setDraft(emptyDraft());
    setAdvanced(false);
    setError(null);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!template) return;
    setError(null);
    setDone(null);

    const problem = nameProblem(draft.name, { taken: template.stats.map((stat) => stat.name) });
    if (problem) {
      setError(NAME_MESSAGE[problem]);
      return;
    }

    // Los derivados comparten el espacio de nombres con las estadisticas: el
    // motor emite E_COLISION si un id esta en los dos sitios.
    const taken = [
      ...template.stats.map((stat) => stat.id),
      ...template.derived.map((entry) => entry.id),
    ];
    const stat = statFrom(suggestStatId(draft.name.trim(), draft.unit, taken), draft);

    setPending(true);
    try {
      await saveTemplate({ ...template, stats: [...template.stats, stat] });
      setDone(editorCopy.stats.created);
      reset();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : editorCopy.stats.failed);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
        >
          {editorCopy.stats.add}
        </Button>
        {done ? (
          <p className="m-0 text-[13px] text-muted-foreground" role="status">
            {done}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 border border-border bg-card px-4 py-4">
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}

      <StatFields
        idPrefix="stat"
        draft={draft}
        onChange={setDraft}
        advanced={advanced}
        onToggleAdvanced={() => setAdvanced((value) => !value)}
        autoFocus
      />

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? editorCopy.stats.pending : editorCopy.stats.submit}
        </Button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {editorCopy.stats.cancel}
        </button>
      </div>
    </form>
  );
}
