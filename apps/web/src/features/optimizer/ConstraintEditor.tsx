import type { Constraint, GameTemplate } from '@zenith/shared-types';

import { gameCopy } from '../game/copy';
import { ConstraintRow } from './cockpit/ConstraintRow';
import { useConstraintStrip } from './cockpit/use-constraint-strip';

interface ConstraintEditorProps {
  template: GameTemplate;
  constraints: Constraint[];
  onChange: (next: Constraint[]) => void;
  /** Texto del boton de agregar; la barra lo llama "Add condition". */
  addLabel?: string;
}

/**
 * Tira horizontal de condiciones: las filas scrollean y el boton de agregar
 * queda fijo al final. Se usa igual en la barra y en la hoja de setup.
 */
export function ConstraintEditor({
  template,
  constraints,
  onChange,
  addLabel = gameCopy.cockpit.addConstraint,
}: ConstraintEditorProps) {
  const { stripRef, add } = useConstraintStrip(template, constraints, onChange);

  if (template.constrainableStats.length === 0) return null;

  const update = (index: number, patch: Partial<Constraint>) => {
    onChange(
      constraints.map((constraint, i) => (i === index ? { ...constraint, ...patch } : constraint)),
    );
  };

  return (
    <div data-no-toggle className="flex min-w-0 items-center gap-1.5">
      <div ref={stripRef} className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1">
        {constraints.map((constraint, index) => (
          <ConstraintRow
            key={`${constraint.statId}-${index}`}
            template={template}
            constraint={constraint}
            index={index}
            onChange={(patch) => update(index, patch)}
            onRemove={() => onChange(constraints.filter((_, i) => i !== index))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-[2px] border border-dashed border-line-strong px-2.5 text-[11.5px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
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
        {addLabel}
      </button>
    </div>
  );
}
