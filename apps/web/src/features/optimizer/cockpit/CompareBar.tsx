import { useEffect, useState } from 'react';

import type { BuildResult, GameTemplate, Item } from '@zenith/shared-types';

import { cn } from '../../../lib/cn';
import { itemIconUrls } from '../../../lib/images';
import { gameCopy } from '../../game/copy';
import { ItemGlyph } from '../../inventory/ItemGlyph';
import { ItemHoverCard } from '../../inventory/ItemHoverCard';
import { formatDelta, formatNumber, formatStat } from '../stat-format';
import { surfaceToggle } from './click-surface';

interface CompareBarProps {
  template: GameTemplate;
  objective: GameTemplate['objectives'][number];
  builds: BuildResult[];
  items: Item[];
  /** Build puesta: entra como opcion, aunque no venga de la busqueda. */
  equipped?: BuildResult | null;
}

interface PickableBuild {
  build: BuildResult;
  /** Puesto en el ranking; `null` cuando es la build puesta y no salio de la busqueda. */
  rank: number | null;
  equipped: boolean;
}

const signedDelta = (value: number): string =>
  Math.abs(value) < 1e-9 ? '—' : `${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;

const sameItems = (a: BuildResult, b: BuildResult): boolean =>
  a.itemIds.length === b.itemIds.length &&
  a.itemIds.every((itemId, index) => (itemId ?? '') === (b.itemIds[index] ?? ''));

const optionLabel = (option: PickableBuild): string => {
  const head =
    option.rank === null
      ? gameCopy.cockpit.equippedRow
      : `#${String(option.rank).padStart(2, '0')}`;
  const tag = option.equipped && option.rank !== null ? ` · ${gameCopy.cockpit.equippedRow}` : '';
  return `${head} · ${formatNumber(option.build.score)}${tag}`;
};

/**
 * Comparacion de dos builds como una barra que se abre y cierra. Cerrada ocupa
 * una linea con los dos selectores y la diferencia de puntaje; abierta suma el
 * equipamiento ranura por ranura y las stats con su delta. La build puesta es
 * una opcion mas, marcada `Equipped`, aunque no haya salido de la busqueda.
 */
export function CompareBar({
  template,
  objective,
  builds,
  items,
  equipped,
}: CompareBarProps) {
  const [open, setOpen] = useState(false);
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);

  const options: PickableBuild[] = [
    ...builds.map((build) => ({ build, fromSearch: true })),
    ...(equipped && !builds.some((entry) => sameItems(entry, equipped))
      ? [{ build: equipped, fromSearch: false }]
      : []),
  ]
    .sort((a, b) => b.build.score - a.build.score)
    .map((entry, index) => ({
      build: entry.build,
      rank: entry.fromSearch ? index + 1 : null,
      equipped: equipped ? sameItems(entry.build, equipped) : false,
    }));

  const optionCount = options.length;

  useEffect(() => {
    if (leftIndex >= optionCount) setLeftIndex(0);
    if (rightIndex >= optionCount) setRightIndex(optionCount > 1 ? 1 : 0);
  }, [optionCount, leftIndex, rightIndex]);

  if (optionCount < 2) {
    return (
      <section className="border-t border-line bg-surface px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[12.5px] font-semibold">{gameCopy.cockpit.compareBuilds}</span>
          <span className="text-[11.5px] text-muted-foreground">
            {gameCopy.cockpit.onlyOneBuild}
          </span>
        </div>
      </section>
    );
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const left = options[leftIndex] ?? options[0];
  const right = options[rightIndex] ?? options[1];
  if (!left || !right) return null;

  const leftBuild = left.build;
  const rightBuild = right.build;
  const identical = sameItems(leftBuild, rightBuild);
  const delta = rightBuild.score - leftBuild.score;
  const rows = template.slots.map((slot, index) => ({
    slot,
    left: byId.get(leftBuild.itemIds[index] ?? ''),
    right: byId.get(rightBuild.itemIds[index] ?? ''),
    same: (leftBuild.itemIds[index] ?? '') === (rightBuild.itemIds[index] ?? ''),
  }));
  const differing = rows.filter((row) => !row.same).length;
  const stats = template.stats.filter(
    (stat) =>
      Math.abs(leftBuild.finalStats[stat.id] ?? 0) > 0.05 ||
      Math.abs(rightBuild.finalStats[stat.id] ?? 0) > 0.05,
  );

  return (
    <section className="border-t border-line">
      <div
        onClick={(event) => surfaceToggle(event.target, () => setOpen((current) => !current))}
        className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-4 py-2 transition-colors hover:bg-raised"
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="compare-body"
          className="group inline-flex items-center gap-2 rounded-[2px] text-foreground"
        >
          <span className="text-[12.5px] font-semibold tracking-[-0.01em]">
            {gameCopy.cockpit.compareBuilds}
          </span>
          <span
            className={cn(
              'grid h-7 w-7 place-items-center rounded-[2px] border text-muted-foreground transition-colors',
              open
                ? 'border-line-strong text-foreground'
                : 'border-line group-hover:border-line-strong group-hover:text-foreground',
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
              className={cn('transition-transform duration-150', open && 'rotate-180')}
            >
              <path d="M5 8l5 5 5-5" />
            </svg>
          </span>
        </button>

        <BuildPicker
          short={gameCopy.cockpit.buildAShort}
          label={gameCopy.cockpit.buildA}
          value={leftIndex}
          options={options}
          onChange={setLeftIndex}
        />
        <BuildPicker
          short={gameCopy.cockpit.buildBShort}
          label={gameCopy.cockpit.buildB}
          value={rightIndex}
          options={options}
          onChange={setRightIndex}
        />

        <span
          className={cn(
            'font-mono text-[11px] tabular-nums',
            identical
              ? 'text-muted-foreground'
              : delta > 0
                ? 'text-[oklch(0.72_0.14_150)]'
                : 'text-[oklch(0.7_0.16_25)]',
          )}
        >
          {signedDelta(delta)}
        </span>

        {open ? null : (
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {identical
              ? gameCopy.cockpit.identicalBuilds
              : gameCopy.cockpit.piecesDiffer(differing, rows.length)}
          </span>
        )}
      </div>

      {open ? (
        <div
          id="compare-body"
          className="grid gap-x-6 gap-y-4 border-t border-line bg-background px-4 py-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
        >
          <div className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-2.5">
              <span className="label-caps">{gameCopy.cockpit.equipment}</span>
              <span className="label-caps">
                {identical
                  ? gameCopy.cockpit.sameEquipment
                  : gameCopy.cockpit.piecesDiffer(differing, rows.length)}
              </span>
            </div>

            <div className="flex flex-col">
              {rows.map(({ slot, left: pieceA, right: pieceB, same }) => (
                <div
                  key={slot.id}
                  aria-label={`${slot.name}: ${
                    same ? gameCopy.cockpit.sameEquipment : gameCopy.cockpit.difference
                  }`}
                  className="grid grid-cols-[54px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-b border-line py-[6px] last:border-b-0"
                >
                  <span className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.05em] text-muted-foreground">
                    {same ? null : (
                      <span aria-hidden="true" className="text-foreground">
                        ≠
                      </span>
                    )}
                    <span className="truncate">{slot.name}</span>
                  </span>
                  <PieceCell template={template} item={pieceA} muted={same} />
                  <PieceCell template={template} item={pieceB} muted={same} />
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-2.5">
              <span className="label-caps">{gameCopy.cockpit.currentStats}</span>
              <span className="label-caps">{gameCopy.cockpit.difference}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[minmax(0,1fr)_58px_58px_52px] items-baseline gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                <span className="truncate">{objective.name}</span>
                <span className="text-end">{gameCopy.cockpit.buildAShort}</span>
                <span className="text-end">{gameCopy.cockpit.buildBShort}</span>
                <span className="text-end">Δ</span>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_58px_58px_52px] items-baseline gap-2 text-[12px]">
                <span className="truncate font-semibold">{gameCopy.cockpit.score}</span>
                <span className="text-end font-mono tabular-nums">
                  {formatNumber(leftBuild.score)}
                </span>
                <span className="text-end font-mono tabular-nums">
                  {formatNumber(rightBuild.score)}
                </span>
                <span
                  className={cn(
                    'text-end font-mono text-[10.5px] tabular-nums',
                    identical || Math.abs(delta) < 1e-9
                      ? 'text-muted-foreground'
                      : delta > 0
                        ? 'text-[oklch(0.72_0.14_150)]'
                        : 'text-[oklch(0.7_0.16_25)]',
                  )}
                >
                  {signedDelta(delta)}
                </span>
              </div>

              {stats.map((stat) => {
                const a = leftBuild.finalStats[stat.id] ?? 0;
                const b = rightBuild.finalStats[stat.id] ?? 0;
                const diff = b - a;
                return (
                  <div
                    key={stat.id}
                    className="grid grid-cols-[minmax(0,1fr)_58px_58px_52px] items-baseline gap-2 text-[12px]"
                  >
                    <span className="truncate text-muted-foreground">{stat.name}</span>
                    <span className="text-end font-mono tabular-nums">{formatStat(a, stat)}</span>
                    <span className="text-end font-mono tabular-nums">{formatStat(b, stat)}</span>
                    <span
                      className={cn(
                        'text-end font-mono text-[10.5px] tabular-nums',
                        Math.abs(diff) < 1e-9
                          ? 'text-muted-foreground'
                          : diff > 0
                            ? 'text-[oklch(0.72_0.14_150)]'
                            : 'text-[oklch(0.7_0.16_25)]',
                      )}
                    >
                      {formatDelta(diff, stat)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BuildPicker({
  short,
  label,
  value,
  options,
  onChange,
}: {
  short: string;
  label: string;
  value: number;
  options: PickableBuild[];
  onChange: (index: number) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground"
      >
        {short}
      </span>
      <select
        aria-label={label}
        className="h-7 rounded-[2px] border border-line bg-background px-1.5 font-mono text-[10.5px] text-foreground outline-none transition-colors focus:border-line-strong"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option, index) => (
          <option key={`${option.build.score}-${index}`} value={index}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PieceCell({
  template,
  item,
  muted,
}: {
  template: GameTemplate;
  item: Item | undefined;
  muted: boolean;
}) {
  return (
    <ItemHoverCard
      as="div"
      template={template}
      item={item}
      className="flex min-w-0 items-center gap-1.5"
    >
      <ItemGlyph
        name={item?.name ?? gameCopy.cockpit.emptySlot}
        rarity={item?.rarity}
        sources={item ? itemIconUrls(template.assets, item) : []}
        className="h-[18px] w-[18px] shrink-0 text-[6px]"
      />
      <span
        className={cn(
          'min-w-0 truncate text-[11.5px]',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {item?.name ?? gameCopy.cockpit.emptySlot}
      </span>
    </ItemHoverCard>
  );
}
