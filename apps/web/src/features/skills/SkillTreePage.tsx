import { Link } from 'react-router-dom';

import { EmptyState } from '../catalog/components/EmptyState';
import { useOptimizerWorkspace } from '../optimizer/workspace/OptimizerWorkspaceProvider';
import { skillCopy } from './copy';
import { SkillTreePanel } from './SkillTreePanel';

export function SkillTreePage() {
  const { id, template, skills } = useOptimizerWorkspace();
  const { selection, save, error } = skills;

  if (!template || !template.skillTrees?.length) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <EmptyState title={skillCopy.missingTitle} body={skillCopy.missingBody}>
          <Link
            to={`/optimizer/${id}`}
            className="inline-flex h-9 items-center rounded-[2px] border border-line px-4 text-[12.5px] font-semibold transition-colors hover:border-line-strong hover:bg-raised"
          >
            {skillCopy.backToOptimizer}
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 max-[860px]:px-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="min-w-0">
          <p className="label-caps mb-1">{skillCopy.eyebrow}</p>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em]">{skillCopy.title}</h1>
          <p className="mt-2 max-w-[80ch] text-sm text-muted-foreground">{skillCopy.lede}</p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {template.name}
        </p>
      </header>

      {error ? (
        <p role="alert" className="mt-4 rounded-[2px] border border-[oklch(0.6_0.19_25)] px-3 py-2 text-[12.5px] text-[oklch(0.78_0.16_25)]">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        <SkillTreePanel template={template} selection={selection} onChange={(next) => void save(next)} />
      </div>
    </div>
  );
}
