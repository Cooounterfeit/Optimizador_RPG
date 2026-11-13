import type { BuildResult, Equipment, GameTemplate, Item, SolveResponse } from '@zenith/shared-types';

import { gameCopy } from '../game/copy';
import { BuildCard } from './BuildCard';
import { BuildComparison } from './BuildComparison';

interface OptimizerResultProps {
  template: GameTemplate;
  objective: GameTemplate['objectives'][number];
  result: SolveResponse;
  items: Item[];
  /** Equipo puesto: para marcar cual build ya es "mi build". */
  equipment?: Equipment;
  /** Guarda una build como el equipo del personaje. */
  onEquip?: (build: BuildResult) => void;
}

export function OptimizerResult({
  template,
  objective,
  result,
  items,
  equipment,
  onEquip,
}: OptimizerResultProps) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const best = result.builds[0];

  if (!best) {
    return (
      <section className="rounded-[4px] border border-line bg-surface p-5">
        <p className="label-caps">{gameCopy.cockpit.bestBuilds}</p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {result.stats.stoppedBy === 'usuario'
            ? gameCopy.cockpit.stoppedNoBuild
            : gameCopy.cockpit.noFeasible}
        </p>
      </section>
    );
  }

  const message = result.stats.provenOptimal
    ? gameCopy.cockpit.provenOptimal
    : result.stats.stoppedBy === 'usuario'
      ? gameCopy.cockpit.stoppedByUser
      : gameCopy.cockpit.stoppedByTime;

  /** Las piezas que estan puestas, en el orden de las ranuras de la plantilla. */
  const equippedIds = template.slots.map((slot) => equipment?.[slot.id] ?? '');
  const isEquipped = (build: BuildResult): boolean =>
    onEquip !== undefined &&
    build.itemIds.length === equippedIds.length &&
    build.itemIds.every((itemId, index) => (itemId ?? '') === equippedIds[index]);

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <p className="label-caps">{gameCopy.cockpit.bestBuilds}</p>
        <span className="font-mono text-[10px] text-muted-foreground">
          {result.stats.evaluated.toLocaleString('en-US')} {gameCopy.cockpit.evaluated}
        </span>
      </div>

      <p className="mt-3 text-[12.5px] text-muted-foreground">{message}</p>

      <div className="mt-4 flex flex-col gap-3">
        {result.builds.map((build, index) => (
          <BuildCard
            key={`${build.score}-${index}`}
            template={template}
            build={build}
            best={best}
            rank={index}
            objective={objective}
            items={byId}
            onEquip={onEquip}
            equipped={isEquipped(build)}
          />
        ))}
      </div>

      <BuildComparison template={template} objective={objective} builds={result.builds} />
    </section>
  );
}
