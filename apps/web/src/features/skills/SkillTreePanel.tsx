import { useState } from 'react';

import type { GameTemplate, SkillSelection } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { skillCopy } from './copy';
import { SkillCatalog } from './SkillCatalog';
import { SkillTreeCanvas } from './SkillTreeCanvas';

interface SkillTreePanelProps {
  template: GameTemplate;
  selection: SkillSelection;
  onChange: (next: SkillSelection) => void;
}

type View = 'tree' | 'catalog';

export function SkillTreePanel({ template, selection, onChange }: SkillTreePanelProps) {
  const [view, setView] = useState<View>('tree');
  const trees = template.skillTrees ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Skills">
        {(
          [
            { id: 'tree', label: skillCopy.treeTab },
            { id: 'catalog', label: skillCopy.catalogTab },
          ] as const
        ).map((entry) => {
          const active = view === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(entry.id)}
              className={cn(
                'relative -mb-px border-b-2 px-3 py-2.5 text-[12.5px] transition-colors',
                active
                  ? 'border-foreground font-semibold text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {view === 'tree' ? (
        <div className="flex flex-col gap-4">
          {trees.map((tree) => (
            <SkillTreeCanvas
              key={tree.id}
              tree={tree}
              template={template}
              selection={selection}
              onChange={onChange}
            />
          ))}
        </div>
      ) : (
        <SkillCatalog template={template} selection={selection} />
      )}
    </div>
  );
}
