import { Link } from 'react-router-dom';

import { buttonVariants } from '../../components/ui/Button';
import { CoverArt } from '../catalog/components/CoverArt';
import { gameCopy } from '../game/copy';
import { useOptimizerWorkspace } from './workspace/OptimizerWorkspaceProvider';

/**
 * Ficha del juego: lo que antes era la cabecera de Optimize. Es la entrada del
 * workspace, asi que no decide nada: cuenta que juego es, que se puede calcular
 * y con que limites, y manda a Optimize.
 */
export function OverviewPage() {
  const { id, template } = useOptimizerWorkspace();
  if (!template) return null;

  const counts = [
    { label: gameCopy.counts.stats, value: template.stats.length },
    { label: gameCopy.counts.slots, value: template.slots.length },
    { label: gameCopy.counts.sets, value: template.sets.length },
    { label: gameCopy.counts.objectives, value: template.objectives.length },
    { label: gameCopy.counts.characters, value: template.baseProfiles.length },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-6 max-[860px]:px-4">
      <header className="grid gap-6 border-b border-line pb-6 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <CoverArt name={template.name} cover={template.cover} className="rounded-[4px] border border-line">
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-[1px] bg-foreground px-2 py-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.13em] text-primary-foreground">
            <span className="h-1 w-1 bg-current" aria-hidden="true" />
            {gameCopy.cockpit.published}
          </span>
        </CoverArt>

        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <p className="label-caps mb-1">{gameCopy.eyebrow}</p>
            <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em]">{template.name}</h1>
            <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
              {template.description}
            </p>
            {template.category ? (
              <span className="mt-3 inline-block rounded-[2px] border border-line px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                {template.category}
              </span>
            ) : null}
          </div>

          <dl className="flex flex-wrap border-y border-line py-2.5">
            {counts.map((count) => (
              <div key={count.label} className="min-w-[92px] border-r border-line px-4 first:pl-0 last:border-r-0">
                <dt className="label-caps mb-0.5">{count.label}</dt>
                <dd className="m-0 font-mono text-lg leading-none tabular-nums">{count.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link to={`/optimizer/${id}/optimize`} className={buttonVariants()}>
          {gameCopy.cockpit.optimize}
        </Link>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
          {gameCopy.cockpit.optimizeNote}
        </span>
      </div>

      {template.notes ? (
        <section className="mt-6 rounded-[4px] border border-line bg-surface p-5">
          <p className="label-caps">{gameCopy.cockpit.templateNotes}</p>
          <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
            {template.notes}
          </p>
        </section>
      ) : null}
    </div>
  );
}
