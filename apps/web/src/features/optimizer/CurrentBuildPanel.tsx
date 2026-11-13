import type { Evaluacion } from '@zenith/core-engine';
import type { Equipment, GameTemplate, Item } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { itemIconUrls } from '../../lib/images';
import { gameCopy } from '../game/copy';
import { ItemGlyph } from '../inventory/ItemGlyph';

interface CurrentBuildPanelProps {
  template: GameTemplate;
  objective: GameTemplate['objectives'][number];
  equipment: Equipment;
  items: Map<string, Item>;
  evaluation: Evaluacion | null;
  evaluating: boolean;
  error: string | null;
  /** Puntaje de la mejor build de la busqueda para este objetivo, si ya corrio. */
  bestScore?: number;
  /** `true` mientras se lee el equipo guardado. */
  loading?: boolean;
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const formatStat = (value: number, unit: string | undefined): string => {
  const formatted = numberFormat.format(value);
  if (unit === 'percent') return `${formatted}%`;
  if (unit === 'multiply') return `×${formatted}`;
  return formatted;
};

/**
 * "Mi build": el equipo puesto, con sus numeros recalculados por el motor y la
 * diferencia contra la mejor build encontrada. No se guardan stats ni puntaje:
 * se derivan del equipo y de las reglas vigentes.
 */
export function CurrentBuildPanel({
  template,
  objective,
  equipment,
  items,
  evaluation,
  evaluating,
  error,
  bestScore,
  loading = false,
}: CurrentBuildPanelProps) {
  const slots = template.slots.map((slot) => ({
    slot,
    item: items.get(equipment[slot.id] ?? ''),
  }));
  const equippedCount = slots.filter(({ item }) => item !== undefined).length;
  const score = evaluation?.objetivos[objective.id];
  const difference = score !== undefined && bestScore !== undefined ? score - bestScore : undefined;
  const ties =
    difference !== undefined &&
    Math.abs(difference) <= 1e-9 * Math.max(1, Math.abs(bestScore ?? 0));

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <p className="label-caps">{gameCopy.cockpit.currentBuild}</p>
        <span className="text-[12px] text-muted-foreground">{objective.name}</span>
      </div>

      {loading ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {gameCopy.loading}
        </p>
      ) : equippedCount === 0 ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
          {gameCopy.cockpit.currentBuildEmpty}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {gameCopy.cockpit.currentBuildScore}
            </span>
            <strong className="font-mono text-lg tabular-nums">
              {score === undefined ? '—' : numberFormat.format(score)}
            </strong>
            {difference !== undefined ? (
              <span
                className={cn(
                  'text-[11px]',
                  ties ? 'text-muted-foreground' : 'text-[oklch(0.7_0.16_25)]',
                )}
              >
                {ties
                  ? gameCopy.cockpit.tiesBest
                  : `${difference > 0 ? '+' : ''}${numberFormat.format(difference)} ${gameCopy.cockpit.vsBest}`}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {gameCopy.cockpit.currentBuildNoResult}
              </span>
            )}
          </div>

          {evaluating ? (
            <p
              role="status"
              className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              {gameCopy.cockpit.currentBuildLoading}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-2 text-[12px] text-[oklch(0.78_0.16_25)]">
              {error}
            </p>
          ) : null}

          <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
            {slots.map(({ slot, item }) => (
              <div key={slot.id} className="flex min-w-0 items-center gap-2">
                <ItemGlyph
                  name={item?.name ?? slot.name}
                  rarity={item?.rarity}
                  sources={item ? itemIconUrls(template.assets, item) : []}
                  className="h-8 w-8 text-[9px]"
                />
                <div className="min-w-0">
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    {slot.name}
                  </p>
                  <p className="truncate text-[12px]">
                    {item?.name ?? gameCopy.cockpit.emptySlot}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {evaluation ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 sm:grid-cols-3">
              {template.stats
                .filter((stat) => Math.abs(evaluation.finalStats[stat.id] ?? 0) > 0.05)
                .map((stat) => (
                  <div key={stat.id} className="flex items-baseline justify-between gap-2">
                    <dt className="truncate text-[11px] text-muted-foreground">{stat.name}</dt>
                    <dd className="m-0 font-mono text-[11px] tabular-nums">
                      {formatStat(evaluation.finalStats[stat.id] ?? 0, stat.unit)}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </>
      )}
    </section>
  );
}
