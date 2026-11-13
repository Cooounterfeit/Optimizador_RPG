import type { BuildResult, GameTemplate, Item } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { itemIconUrls } from '../../lib/images';
import { gameCopy } from '../game/copy';
import { ItemGlyph } from '../inventory/ItemGlyph';

interface BuildCardProps {
  template: GameTemplate;
  build: BuildResult;
  best: BuildResult;
  rank: number;
  objective: GameTemplate['objectives'][number];
  items: Map<string, Item>;
  /** Guarda esta build como el equipo puesto del personaje. */
  onEquip?: (build: BuildResult) => void;
  /** `true` cuando las piezas de esta build son las que estan puestas. */
  equipped?: boolean;
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const formatStat = (value: number, unit: string | undefined): string => {
  const formatted = numberFormat.format(value);
  if (unit === 'percent') return `${formatted}%`;
  if (unit === 'multiply') return `×${formatted}`;
  return formatted;
};

export function BuildCard({ template, build, best, rank, objective, items, onEquip, equipped }: BuildCardProps) {
  const bestScore = best.score;
  const difference = build.score - bestScore;
  const ties = rank > 0 && Math.abs(difference) <= 1e-9 * Math.max(1, Math.abs(bestScore));
  const slots = template.slots.map((slot, index) => ({
    slot,
    item: items.get(build.itemIds[index] ?? ''),
  }));

  return (
    <article
      className={cn(
        'rounded-[4px] border border-line bg-surface p-4',
        rank === 0 && 'border-line-strong',
      )}
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {rank === 0 ? gameCopy.cockpit.best : `#${rank + 1}`}
        </span>
        <strong className="font-mono text-lg tabular-nums">
          {numberFormat.format(build.score)}
        </strong>
        <span className="text-[12px] text-muted-foreground">{objective.name}</span>
        {rank > 0 ? (
          <span className={cn('ml-auto text-[11px]', ties ? 'text-muted-foreground' : 'text-[oklch(0.7_0.16_25)]')}>
            {ties
              ? gameCopy.cockpit.tiesBest
              : `${difference > 0 ? '+' : ''}${numberFormat.format(difference)} ${gameCopy.cockpit.vsBest}`}
          </span>
        ) : null}
      </header>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
              <p className="truncate text-[12px]">{item?.name ?? gameCopy.cockpit.emptySlot}</p>
            </div>
          </div>
        ))}
      </div>

      {build.activeSets.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {build.activeSets.map((set) => (
            <span
              key={set.setId}
              className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
            >
              {set.name} · {set.pieces}
            </span>
          ))}
        </div>
      ) : null}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 sm:grid-cols-3">
        {template.stats
          .filter((stat) => Math.abs(build.finalStats[stat.id] ?? 0) > 0.05)
          .map((stat) => {
            const value = build.finalStats[stat.id] ?? 0;
            const delta = rank > 0 ? value - (best.finalStats[stat.id] ?? 0) : 0;
            return (
              <div key={stat.id} className="flex items-baseline justify-between gap-2">
                <dt className="truncate text-[11px] text-muted-foreground">{stat.name}</dt>
                <dd className="m-0 font-mono text-[11px] tabular-nums">
                  {formatStat(value, stat.unit)}
                  {Math.abs(delta) > 0.05 ? (
                    <span className={cn('ml-1', delta > 0 ? 'text-[oklch(0.72_0.14_150)]' : 'text-[oklch(0.7_0.16_25)]')}>
                      {delta > 0 ? '+' : ''}
                      {numberFormat.format(delta)}
                    </span>
                  ) : null}
                </dd>
              </div>
            );
          })}
      </dl>

      {onEquip ? (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3">
          {equipped ? (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
              {gameCopy.cockpit.equipped}
            </span>
          ) : null}
          <button
            type="button"
            className="h-8 rounded-[2px] border border-line px-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-foreground transition-colors hover:border-line-strong disabled:opacity-50"
            disabled={equipped === true}
            onClick={() => onEquip(build)}
          >
            {gameCopy.cockpit.equip}
          </button>
        </div>
      ) : null}
    </article>
  );
}
