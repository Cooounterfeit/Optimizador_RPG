import { useId, useState } from 'react';

import type { Constraint, GameTemplate } from '@zenith/shared-types';

import { cn } from '../../../lib/cn';
import { gameCopy } from '../../game/copy';

interface ConstraintRowProps {
  template: GameTemplate;
  constraint: Constraint;
  /** Posicion en la lista; solo se usa para ids estables de los radios. */
  index: number;
  onChange: (patch: Partial<Constraint>) => void;
  onRemove: () => void;
  /** Durante una busqueda no se editan las condiciones. */
  disabled?: boolean;
}

/**
 * Una condicion del objetivo. La direccion es un par de radios reales (`≥`/`≤`)
 * en vez de un icono: en una fila de 28 px un glifo se lee como un control roto.
 * Al cambiar de direccion el valor se mueve con el, igual que antes en el editor.
 *
 * La misma fila se usa en la barra y en la hoja: el contenedor decide si
 * scrollea en horizontal.
 */
export function ConstraintRow({
  template,
  constraint,
  index,
  onChange,
  onRemove,
  disabled = false,
}: ConstraintRowProps) {
  const baseId = useId();
  const groupName = `constraint-${index}-${constraint.statId}-${baseId}`;
  const stat = template.stats.find((entry) => entry.id === constraint.statId);
  const isMax = constraint.max !== undefined;
  const value = (isMax ? constraint.max : constraint.min) ?? 0;
  const unit = stat?.aggregate === 'multiply' ? '×' : stat?.unit === 'percent' ? '%' : '';
  const [draft, setDraft] = useState<string | null>(null);

  const setDirection = (kind: 'min' | 'max') => {
    if ((kind === 'max') === isMax) return;
    onChange(kind === 'max' ? { min: undefined, max: value } : { max: undefined, min: value });
  };

  const commit = (raw: string) => {
    const next = Number(raw.replace(',', '.'));
    if (!Number.isFinite(next)) return;
    onChange(isMax ? { max: next } : { min: next });
  };

  const direction = (
    <span
      role="radiogroup"
      aria-label={gameCopy.cockpit.constraintKind}
      className="inline-flex h-5 shrink-0 overflow-hidden rounded-[2px] border border-line"
    >
      <input
        type="radio"
        aria-label={gameCopy.cockpit.constraintMin}
        className="peer sr-only"
        id={`${groupName}-min`}
        name={groupName}
        disabled={disabled}
        checked={!isMax}
        onChange={() => setDirection('min')}
      />
      <label
        htmlFor={`${groupName}-min`}
        title={gameCopy.cockpit.constraintMin}
        className={cn(
          'grid w-4 cursor-pointer place-items-center font-mono text-[11px] leading-none transition-colors',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-foreground',
          isMax ? 'text-muted-foreground hover:text-foreground' : 'bg-foreground text-background',
        )}
      >
        ≥
      </label>
      <input
        type="radio"
        aria-label={gameCopy.cockpit.constraintMax}
        className="peer sr-only"
        id={`${groupName}-max`}
        name={groupName}
        disabled={disabled}
        checked={isMax}
        onChange={() => setDirection('max')}
      />
      <label
        htmlFor={`${groupName}-max`}
        title={gameCopy.cockpit.constraintMax}
        className={cn(
          'grid w-4 cursor-pointer place-items-center border-l border-line font-mono text-[11px] leading-none transition-colors',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-foreground',
          isMax ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        ≤
      </label>
    </span>
  );

  return (
    <div
      data-no-toggle
      data-constraint-row
      className="grid h-7 w-auto shrink-0 grid-cols-[auto_32px_40px_auto_14px] items-center gap-1.5 rounded-[2px] border border-line bg-background px-2"
    >
      <span className="relative flex min-w-0 items-center">
        <select
          aria-label={gameCopy.cockpit.constraintStat}
          disabled={disabled}
          className="h-5 min-w-0 appearance-none bg-transparent pr-3.5 text-[11.5px] font-medium text-foreground outline-none"
          value={constraint.statId}
          onChange={(event) => onChange({ statId: event.target.value })}
        >
          {template.constrainableStats.map((statId) => (
            <option key={statId} value={statId}>
              {template.stats.find((entry) => entry.id === statId)?.name ?? statId}
            </option>
          ))}
        </select>
        <svg
          width="9"
          height="9"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          aria-hidden="true"
          className="pointer-events-none absolute right-0 text-muted-foreground"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </span>

      {direction}

      <input
        type="text"
        inputMode="decimal"
        aria-label={gameCopy.cockpit.constraintValue}
        disabled={disabled}
        className="w-full bg-transparent text-end font-mono text-[11.5px] text-foreground outline-none"
        value={draft ?? String(value)}
        onFocus={(event) => {
          setDraft(String(value));
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const next = event.target.value;
          if (!/^-?\d*[.,]?\d*$/.test(next)) return;
          setDraft(next);
          if (next === '' || next === '-' || next === '.' || next === ',') return;
          commit(next);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />

      <span className="font-mono text-[10.5px] text-muted-foreground">{unit}</span>

      <button
        type="button"
        aria-label={gameCopy.cockpit.removeConstraint}
        disabled={disabled}
        onClick={onRemove}
        className="grid place-items-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M5 5l10 10M15 5L5 15" />
        </svg>
      </button>
    </div>
  );
}
