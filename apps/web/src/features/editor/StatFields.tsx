import type { StatDef } from '@zenith/shared-types';

import { fieldClass, labelClass } from '../../components/ui/form';

import { editorCopy } from './copy';

/**
 * Los campos de una estadistica
 * =============================
 * Los comparten el alta (CFG-01) y la edicion (CFG-03). Estaban a punto de
 * existir dos veces, que es la duplicacion que ya se limpio una vez en este
 * mismo directorio.
 *
 * El id NO es un campo. Se deriva del nombre al crear y despues no cambia:
 * las formulas, los conjuntos, los presupuestos y las piezas del inventario lo
 * referencian, y cambiarlo sin reescribir todo eso romperia la plantilla en
 * silencio. Renombrar lo VISIBLE es gratis justamente por eso, que es lo que
 * pide el criterio de CFG-03 cuando habla de no romper referencias.
 */

export interface StatDraft {
  name: string;
  unit: StatDef['unit'];
  aggregate: 'sum' | 'multiply';
  group: string;
}

export const draftFrom = (stat: StatDef): StatDraft => ({
  name: stat.name,
  unit: stat.unit,
  aggregate: stat.aggregate === 'multiply' ? 'multiply' : 'sum',
  group: stat.group ?? '',
});

export const emptyDraft = (): StatDraft => ({
  name: '',
  unit: 'flat',
  aggregate: 'sum',
  group: '',
});

/** Lo que se guarda, con los campos opcionales omitidos en vez de vacios. */
export const statFrom = (id: string, draft: StatDraft): StatDef => ({
  id,
  name: draft.name.trim(),
  unit: draft.unit,
  ...(draft.aggregate === 'multiply' ? { aggregate: 'multiply' as const } : {}),
  ...(draft.group.trim() ? { group: draft.group.trim() } : {}),
});

interface StatFieldsProps {
  /** Prefijo de los id del DOM: hay un formulario de alta y uno por fila. */
  idPrefix: string;
  draft: StatDraft;
  onChange: (next: StatDraft) => void;
  /** Mostrar acumulacion y grupo. Al editar conviene abierto. */
  advanced: boolean;
  onToggleAdvanced: () => void;
  autoFocus?: boolean;
}

export function StatFields({
  idPrefix,
  draft,
  onChange,
  advanced,
  onToggleAdvanced,
  autoFocus = false,
}: StatFieldsProps) {
  const set = (parte: Partial<StatDraft>) => onChange({ ...draft, ...parte });

  return (
    <>
      <label className={labelClass} htmlFor={`${idPrefix}-name`}>
        {editorCopy.stats.name}
      </label>
      <input
        id={`${idPrefix}-name`}
        className={fieldClass}
        type="text"
        autoFocus={autoFocus}
        value={draft.name}
        onChange={(event) => set({ name: event.target.value })}
        aria-describedby={`${idPrefix}-name-hint`}
      />
      <p id={`${idPrefix}-name-hint`} className="mt-1.5 text-[12px] text-muted-foreground">
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
                name={`${idPrefix}-unit`}
                value={value}
                checked={draft.unit === value}
                onChange={() => set({ unit: value })}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-muted-foreground">{editorCopy.stats.unitHint}</p>
      </fieldset>

      <button
        type="button"
        aria-expanded={advanced}
        onClick={onToggleAdvanced}
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
                <label key={value} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name={`${idPrefix}-aggregate`}
                    value={value}
                    checked={draft.aggregate === value}
                    onChange={() => set({ aggregate: value })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 max-w-[60ch] text-[12px] text-muted-foreground">
              {editorCopy.stats.aggregateHint}
            </p>
          </fieldset>

          <label className={`${labelClass} mt-4`} htmlFor={`${idPrefix}-group`}>
            {editorCopy.stats.group}
          </label>
          <input
            id={`${idPrefix}-group`}
            className={fieldClass}
            type="text"
            maxLength={40}
            value={draft.group}
            onChange={(event) => set({ group: event.target.value })}
            aria-describedby={`${idPrefix}-group-hint`}
          />
          <p id={`${idPrefix}-group-hint`} className="mt-1.5 text-[12px] text-muted-foreground">
            {editorCopy.stats.groupHint}
          </p>
        </div>
      ) : null}
    </>
  );
}
