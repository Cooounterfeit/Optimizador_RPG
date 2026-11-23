import { useEffect, useState } from 'react';

import type {
  BuildResult,
  Constraint,
  Equipment,
  GameTemplate,
  Item,
  SolveResponse,
} from '@zenith/shared-types';

import { gameCopy } from '../game/copy';
import { CompareBar } from './cockpit/CompareBar';
import { BuildRow } from './BuildRow';
import { SearchSummary } from './cockpit/SearchSummary';
import { formatCount } from './search-summary';

interface OptimizerResultProps {
  template: GameTemplate;
  objective: GameTemplate['objectives'][number];
  /** Ultima corrida. Sin corrida, la lista muestra solo la build puesta. */
  result?: SolveResponse;
  items: Item[];
  /** Equipo puesto: para marcar cual build ya es "mi build". */
  equipment?: Equipment;
  /** Guarda una build como el equipo del personaje. */
  onEquip?: (build: BuildResult) => void;
  /** La build puesta, con la forma de un resultado. `null` si no hay nada puesto. */
  equipped?: BuildResult | null;
  /** Condiciones de la corrida que produjo este resultado. */
  constraints?: Constraint[];
  profileName?: string;
  /** Cuantas builds se pidieron: para el pie `shown of expected`. */
  expected?: number;
  onRunWithoutConstraints?: () => void;
  onEditConstraints?: () => void;
}

interface Row {
  build: BuildResult;
  rank: number | null;
  equipped: boolean;
}

/**
 * Lista de resultados: una fila por build, ordenadas por puntaje, con la build
 * puesta como una fila mas. Al abrir una fila se ven sus piezas, sus stats con
 * la diferencia contra el equipo puesto y las condiciones que cumple.
 *
 * Sin corrida dibuja solo la fila de la build puesta: despues de recargar, el
 * jugador sigue viendo su build sin tener que volver a buscar.
 */
export function OptimizerResult({
  template,
  objective,
  result,
  items,
  equipment,
  onEquip,
  equipped = null,
  constraints,
  profileName,
  expected,
  onRunWithoutConstraints,
  onEditConstraints,
}: OptimizerResultProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const byId = new Map(items.map((item) => [item.id, item]));
  const best = result?.builds[0];

  useEffect(() => {
    setOpenKey(null);
  }, [result]);

  if (result && !best) {
    const message =
      result.stats.stoppedBy === 'usuario'
        ? gameCopy.cockpit.stoppedNoBuild
        : gameCopy.cockpit.noFeasible;

    return (
      <section className="rounded-[4px] border border-line bg-surface p-5">
        <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">
          {gameCopy.cockpit.noFeasibleTitle}
        </h2>
        <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {constraints && constraints.length > 0 ? gameCopy.cockpit.noFeasibleBody : message}
        </p>

        {constraints && constraints.length > 0 ? (
          <div className="mt-3 flex flex-col gap-1 rounded-[4px] border border-line bg-background px-3 py-2">
            {constraints.map((constraint, index) => {
              const stat = template.stats.find((entry) => entry.id === constraint.statId);
              return (
                <div
                  key={`${constraint.statId}-${index}`}
                  className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-baseline gap-2 text-[12px]"
                >
                  <span
                    className="font-mono text-[10px] text-[oklch(0.72_0.14_25)]"
                    aria-hidden="true"
                  >
                    ✕
                  </span>
                  <span className="text-muted-foreground">
                    {stat?.name ?? constraint.statId} ·{' '}
                    {constraint.max !== undefined
                      ? gameCopy.cockpit.constraintMost
                      : gameCopy.cockpit.constraintLeast}{' '}
                    {constraint.max ?? constraint.min}
                    {stat?.unit === 'percent' ? '%' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}

        {onRunWithoutConstraints || onEditConstraints ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {onRunWithoutConstraints ? (
              <button
                type="button"
                onClick={onRunWithoutConstraints}
                className="inline-flex h-8 items-center rounded-[2px] bg-primary px-3 text-[12.5px] font-bold text-primary-foreground transition-colors hover:bg-[oklch(0.99_0_0)]"
              >
                {gameCopy.cockpit.runWithoutConstraints}
              </button>
            ) : null}
            {onEditConstraints ? (
              <button
                type="button"
                onClick={onEditConstraints}
                className="inline-flex h-8 items-center rounded-[2px] border border-line px-3 text-[12.5px] font-semibold transition-colors hover:border-line-strong"
              >
                {gameCopy.cockpit.editConstraints}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  const isEquipped = (build: BuildResult): boolean => {
    if (!equipment) return false;
    const equippedIds = template.slots.map((slot) => equipment[slot.id] ?? '');
    return (
      build.itemIds.length === equippedIds.length &&
      build.itemIds.every((itemId, index) => (itemId ?? '') === equippedIds[index])
    );
  };

  const resultRows = result?.builds.map((build) => ({
    build,
    rank: 0 as number | null,
    equipped: isEquipped(build),
  })) ?? [];
  const alreadyListed = resultRows.some((row) => row.equipped);

  const rows: Row[] = [
    ...resultRows,
    ...(equipped && !alreadyListed
      ? [{ build: equipped, rank: null as number | null, equipped: true }]
      : []),
  ]
    .sort((a, b) => b.build.score - a.build.score)
    .map((row, index) => ({ ...row, rank: row.rank === null ? null : index + 1 }));

  if (rows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[4px] border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-background px-4 py-2.5">
        <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]">
          {result ? gameCopy.cockpit.bestBuilds : gameCopy.cockpit.currentBuild}
        </h2>
        {result ? (
          <SearchSummary stats={result.stats} />
        ) : (
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {objective.name}
          </span>
        )}
      </div>

      <ul className="m-0 list-none p-0">
        {rows.map((row) => {
          const key = row.equipped ? 'equipped' : `rank-${row.rank}`;
          return (
            <BuildRow
              key={key}
              template={template}
              build={row.build}
              rank={row.rank}
              equipped={row.equipped}
              baseline={equipped}
              provenOptimal={result?.stats.provenOptimal ?? false}
              constraints={constraints}
              items={byId}
              open={openKey === key}
              onToggle={() => setOpenKey((current) => (current === key ? null : key))}
              onEquip={onEquip}
              profileName={profileName}
              evaluated={result?.stats.evaluated}
              elapsedMs={result?.stats.elapsedMs}
            />
          );
        })}
      </ul>

      {result ? (
        <CompareBar
          template={template}
          objective={objective}
          builds={result.builds}
          items={items}
          equipped={equipped}
        />
      ) : null}

      {result ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-background px-4 py-2.5">
          <span className="label-caps">
            {gameCopy.cockpit.rowsShown(
              rows.length,
              Math.max(rows.length, expected ?? rows.length),
            )}
          </span>
          <span className="font-mono text-[9.5px] text-muted-foreground">
            {formatCount(result.stats.evaluated)} {gameCopy.cockpit.evaluatedNow}
          </span>
        </div>
      ) : null}
    </section>
  );
}
