import type { Constraint, GameTemplate } from '@zenith/shared-types';

import { Button } from '../../components/ui/Button';
import { gameCopy } from '../game/copy';

interface ConstraintEditorProps {
  template: GameTemplate;
  constraints: Constraint[];
  onChange: (next: Constraint[]) => void;
}

const controlClass =
  'h-8 rounded-[2px] border border-line bg-background px-2 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-line-strong';

export function ConstraintEditor({ template, constraints, onChange }: ConstraintEditorProps) {
  if (template.constrainableStats.length === 0) return null;

  const nameOf = (statId: string) =>
    template.stats.find((stat) => stat.id === statId)?.name ?? statId;

  const update = (index: number, patch: Partial<Constraint>) => {
    onChange(constraints.map((constraint, i) => (i === index ? { ...constraint, ...patch } : constraint)));
  };

  const add = () => {
    onChange([...constraints, { statId: template.constrainableStats[0], min: 0 }]);
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      {constraints.map((constraint, index) => {
        const isMax = constraint.max !== undefined;
        const value = isMax ? constraint.max : constraint.min;

        return (
          <div key={`${constraint.statId}-${index}`} className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label={gameCopy.cockpit.constraintStat}
              className={controlClass}
              value={constraint.statId}
              onChange={(event) => update(index, { statId: event.target.value })}
            >
              {template.constrainableStats.map((statId) => (
                <option key={statId} value={statId}>
                  {nameOf(statId)}
                </option>
              ))}
            </select>

            <select
              aria-label={gameCopy.cockpit.constraintKind}
              className={controlClass}
              value={isMax ? 'max' : 'min'}
              onChange={(event) =>
                update(
                  index,
                  event.target.value === 'max'
                    ? { min: undefined, max: value ?? 0 }
                    : { max: undefined, min: value ?? 0 },
                )
              }
            >
              <option value="min">{gameCopy.cockpit.constraintMin}</option>
              <option value="max">{gameCopy.cockpit.constraintMax}</option>
            </select>

            <input
              type="number"
              aria-label={gameCopy.cockpit.constraintValue}
              className={`${controlClass} w-20`}
              value={value ?? ''}
              onChange={(event) => {
                const next = event.target.value === '' ? 0 : Number(event.target.value);
                if (!Number.isFinite(next)) return;
                update(index, isMax ? { max: next } : { min: next });
              }}
            />

            <button
              type="button"
              className="h-8 rounded-[2px] border border-line px-2 text-[11px] text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground"
              aria-label={gameCopy.cockpit.removeConstraint}
              onClick={() => onChange(constraints.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        );
      })}

      <div>
        <Button variant="outline" size="sm" onClick={add}>
          {gameCopy.cockpit.addConstraint}
        </Button>
      </div>
    </div>
  );
}
