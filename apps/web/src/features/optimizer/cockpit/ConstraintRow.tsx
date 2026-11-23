import { useId, useState } from 'react';

import type { Constraint, GameTemplate } from '@zenith/shared-types';

import { cn } from '../../../lib/cn';
import { gameCopy } from '../../game/copy';

interface ConstraintRowProps {
  template: GameTemplate;
  constraint: Constraint;
  /** Posicion en la lista; solo se usa para ids estables de los radios. */
  index: number;
  /**
   * `chip` es la version de la barra: el stat no se elige y no se borra.
   * `row` es la version de la hoja: stat, valor y borrar.
   */
  variant: 'chip' | 'row';
  onChange: (patch: Partial<Constraint>) => void;
  onRemove?: () => void;
  /** Durante una busqueda no se editan las condiciones. */
  disabled?: boolean;
}

/**
 * Una condicion del objetivo. La direccion es un par de radios reales (`≥`/`≤`)
 * en vez de un icono: en una fila de 28 px un glifo se lee como un control roto.
 * Al cambiar de direccion el valor se mueve con el, igual que antes en el editor.
 */
export function ConstraintRow({
  template,
  constraint,
  index,
  variant,
  onChange,
  onRemove,
  disabled = false,
}: ConstraintRowProps) {
  const baseId = useId();
  const groupName = `constraint-${index}-${constraint.statId}-${baseId}`;
  const stat = template.stats.find((entry) => entry.id === constraint.statId);
  const isMax = constraint.max !== undefined;
  const value = (isMax ? constraint.max : constraint.min) ?? 0;
  const unit =
    stat?.aggregate === 'multiply' ? '×' : stat?.unit === 'percent' ? '%' : '';

  const setDirection = (kind: 'min' | 'max') => {
    if ((kind === 'max') === isMax) return;
    onChange(
      kind === 'max'
        ? { min: undefined, max: value }
        : { max: undefined, min: value },
    );
  };

  const commit = (raw: string) => {
    const next = Number(raw.replace(',', '.'));
    if (!Number.isFinite(next)) return;
    onChange(isMax ? { max: next } : { min: next });
  };

  const [draft, setDraft] = useState<string | null>(null);

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

  const valueInput = (className: string, label: string) => (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      disabled={disabled}
      className={cn(
        'bg-transparent text-end font-mono text-[11.5px] text-foreground outline-none',
        className,
      )}
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
  );

  if (variant === 'chip') {
    return (
      <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[2px] border border-line bg-background pl-2 pr-1.5 font-mono text-[11.5px]">
        <span className="whitespace-nowrap text-[9.5px] uppercase tracking-[0.05em] text-foreground">
          {stat?.name ?? constraint.statId}
        </span>
        {direction}
        {valueInput('w-[46px]', `${stat?.name ?? constraint.statId} ${gameCopy.cockpit.constraintValue}`)}
        {unit ? <span className="text-muted-foreground">{unit}</span> : null}
      </span>
    );
  }

  return (
    <div className="grid w-[246px] shrink-0 grid-cols-[minmax(0,104px)_40px_44px_auto_16px] items-center gap-1.5 rounded-[2px] border border-line bg-background px-2">
      <select
        aria-label={gameCopy.cockpit.constraintStat}
        disabled={disabled}
        className="min-w-0 bg-transparent pr-0.5 text-[11.5px] font-medium text-foreground outline-none"
        value={constraint.statId}
        onChange={(event) => onChange({ statId: event.target.value })}
      >
        {template.constrainableStats.map((statId) => (
          <option key={statId} value={statId}>
            {template.stats.find((entry) => entry.id === statId)?.name ?? statId}
          </option>
        ))}
      </select>

      {direction}
      {valueInput('w-full', gameCopy.cockpit.constraintValue)}
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
