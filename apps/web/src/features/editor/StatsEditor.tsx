import { useState, type FormEvent } from 'react';

import type { StatDef } from '@zenith/shared-types';

import { Button } from '../../components/ui/Button';
import { errorClass, fieldClass, labelClass } from '../auth/AuthShell';
import { useOptimizerWorkspace } from '../optimizer/workspace/OptimizerWorkspaceProvider';

import { editorCopy } from './copy';
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

/** Dos nombres chocan si solo se diferencian en mayusculas o espacios al borde. */
const sameName = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

const MAX_NAME = 100;

export function StatsEditor() {
  const { template, saveTemplate } = useOptimizerWorkspace();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<StatDef['unit']>('flat');
  const [aggregate, setAggregate] = useState<'sum' | 'multiply'>('sum');
  const [group, setGroup] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!template) return null;

  const reset = () => {
    setName('');
    setUnit('flat');
    setAggregate('sum');
    setGroup('');
    setAdvanced(false);
    setError(null);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!template) return;
    setError(null);
    setDone(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError(editorCopy.stats.nameRequired);
      return;
    }
    if (trimmed.length > MAX_NAME) {
      setError(editorCopy.stats.nameTooLong);
      return;
    }
    if (template.stats.some((stat) => sameName(stat.name, trimmed))) {
      setError(editorCopy.stats.nameTaken);
      return;
    }

    // Los derivados comparten el espacio de nombres con las estadisticas: el
    // motor emite E_COLISION si un id esta en los dos sitios.
    const taken = [
      ...template.stats.map((stat) => stat.id),
      ...template.derived.map((entry) => entry.id),
    ];

    const stat: StatDef = {
      id: suggestStatId(trimmed, unit, taken),
      name: trimmed,
      unit,
      ...(aggregate === 'multiply' ? { aggregate: 'multiply' as const } : {}),
      ...(group.trim() ? { group: group.trim() } : {}),
    };

    setPending(true);
    try {
      await saveTemplate({ ...template, stats: [...template.stats, stat] });
      setDone(editorCopy.stats.created);
      reset();
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : editorCopy.stats.failed,
      );
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
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-3 border border-border bg-card px-4 py-4"
    >
      {error ? (
        <p className={errorClass} role="alert">
          {error}
        </p>
      ) : null}

      <label className={labelClass} htmlFor="stat-name">
        {editorCopy.stats.name}
      </label>
      <input
        id="stat-name"
        className={fieldClass}
        type="text"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-describedby="stat-name-hint"
      />
      <p
        id="stat-name-hint"
        className="mt-1.5 text-[12px] text-muted-foreground"
      >
        {editorCopy.stats.nameHint}
      </p>

      <fieldset className="mt-4 border-0 p-0">
        <legend className={labelClass}>{editorCopy.stats.unit}</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['flat', editorCopy.stats.unitFlat],
              ['percent', editorCopy.stats.unitPercent],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-[13px]">
              <input
                type="radio"
                name="stat-unit"
                value={value}
                checked={unit === value}
                onChange={() => setUnit(value)}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          {editorCopy.stats.unitHint}
        </p>
      </fieldset>

      <button
        type="button"
        aria-expanded={advanced}
        onClick={() => setAdvanced((value) => !value)}
        className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {editorCopy.stats.more}
      </button>

      {advanced ? (
        <div className="mt-3">
          <fieldset className="border-0 p-0">
            <legend className={labelClass}>{editorCopy.stats.aggregate}</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['sum', editorCopy.stats.aggregateSum],
                  ['multiply', editorCopy.stats.aggregateMultiply],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-[13px]"
                >
                  <input
                    type="radio"
                    name="stat-aggregate"
                    value={value}
                    checked={aggregate === value}
                    onChange={() => setAggregate(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 max-w-[60ch] text-[12px] text-muted-foreground">
              {editorCopy.stats.aggregateHint}
            </p>
          </fieldset>

          <label className={`${labelClass} mt-4`} htmlFor="stat-group">
            {editorCopy.stats.group}
          </label>
          <input
            id="stat-group"
            className={fieldClass}
            type="text"
            maxLength={40}
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            aria-describedby="stat-group-hint"
          />
          <p
            id="stat-group-hint"
            className="mt-1.5 text-[12px] text-muted-foreground"
          >
            {editorCopy.stats.groupHint}
          </p>
        </div>
      ) : null}

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
