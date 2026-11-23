import type { Constraint, GameTemplate } from '@zenith/shared-types';

import { gameCopy } from '../game/copy';
import { ConstraintRow } from './cockpit/ConstraintRow';

interface ConstraintEditorProps {
  template: GameTemplate;
  constraints: Constraint[];
  onChange: (next: Constraint[]) => void;
  /**
   * `true` cuando vive dentro de la hoja de setup: agrega las filas completas.
   * La barra usa `ConstraintRow` en variante `chip`.
   */
  full?: boolean;
}

export function ConstraintEditor({
  template,
  constraints,
  onChange,
  full = true,
}: ConstraintEditorProps) {
  if (template.constrainableStats.length === 0) return null;

  const update = (index: number, patch: Partial<Constraint>) => {
    onChange(
      constraints.map((constraint, i) => (i === index ? { ...constraint, ...patch } : constraint)),
    );
  };

  const add = () => {
    onChange([...constraints, { statId: template.constrainableStats[0], min: 0 }]);
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {constraints.map((constraint, index) => (
        <ConstraintRow
          key={`${constraint.statId}-${index}`}
          template={template}
          constraint={constraint}
          index={index}
          variant={full ? 'row' : 'chip'}
          onChange={(patch) => update(index, patch)}
          onRemove={() => onChange(constraints.filter((_, i) => i !== index))}
        />
      ))}

      <button
        type="button"
        onClick={add}
        className="flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-[2px] border border-dashed border-line-strong px-2.5 text-[11.5px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          aria-hidden="true"
        >
          <path d="M10 4v12M4 10h12" />
        </svg>
        {gameCopy.cockpit.addConstraint}
      </button>
    </div>
  );
}
