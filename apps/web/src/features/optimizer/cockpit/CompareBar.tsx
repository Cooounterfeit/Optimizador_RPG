import { useEffect, useState } from 'react';

import type { BuildResult, GameTemplate, Item } from '@zenith/shared-types';

import { cn } from '../../../lib/cn';
import { itemIconUrls } from '../../../lib/images';
import { gameCopy } from '../../game/copy';
import { ItemGlyph } from '../../inventory/ItemGlyph';
import { ItemHoverCard } from '../../inventory/ItemHoverCard';
import { formatDelta, formatNumber, formatStat } from '../stat-format';

interface CompareBarProps {
  template: GameTemplate;
  objective: GameTemplate['objectives'][number];
  builds: BuildResult[];
  items: Item[];
  /** Build puesta: se marca en los selectores. */
  equipped?: BuildResult | null;
}

const signedDelta = (value: number): string =>
  Math.abs(value) < 1e-9 ? '—' : `${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;

const sameItems = (a: BuildResult, b: BuildResult): boolean =>
  a.itemIds.length === b.itemIds.length &&
  a.itemIds.every((itemId, index) => (itemId ?? '') === (b.itemIds[index] ?? ''));

/**
 * Comparacion de dos builds como una barra que se abre y cierra. Cerrada ocupa
 * una linea con los dos selectores y la diferencia de puntaje; abierta suma el
 * equipamiento ranura por ranura y las stats con su delta.
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

  useEffect(() => {
    if (leftIndex >= builds.length) setLeftIndex(0);
    if (rightIndex >= builds.length) setRightIndex(builds.length > 1 ? 1 : 0);
  }, [builds.length, leftIndex, rightIndex]);

  if (builds.length < 2) {
    return (
      <section className="border-t border-line bg-background px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="label-caps">{gameCopy.cockpit.compareBuilds}</span>
          <span className="text-[11.5px] text-muted-foreground">
            {gameCopy.cockpit.onlyOneBuild}
          </span>
        </div>
      </section>
    );
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const left = builds[leftIndex] ?? builds[0];
  const right = builds[rightIndex] ?? builds[1];
  if (!left || !right) return null;

  const identical = sameItems(left, right);
  const delta = right.score - left.score;
  const rows = template.slots.map((slot, index) => ({
    slot,
    left: byId.get(left.itemIds[index] ?? ''),
    right: byId.get(right.itemIds[index] ?? ''),
    same: (left.itemIds[index] ?? '') === (right.itemIds[index] ?? ''),
  }));
  const differing = rows.filter((row) => !row.same).length;
  const stats = template.stats.filter(
    (stat) =>
      Math.abs(left.finalStats[stat.id] ?? 0) > 0.05 ||
      Math.abs(right.finalStats[stat.id] ?? 0) > 0.05,
  );
  const leftEquipped = equipped ? sameItems(left, equipped) : false;
  const rightEquipped = equipped ? sameItems(right, equipped) : false;

  return (
    <section className="border-t border-line">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-background px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="compare-body"
          className="inline-flex items-center gap-2 text-foreground"
        >
          <span className="label-caps">{gameCopy.cockpit.compareBuilds}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
            className={cn(
              'text-muted-foreground transition-transform duration-150',
              open && 'rotate-180',
            )}
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>

        <BuildPicker
          short={gameCopy.cockpit.buildAShort}
          label={gameCopy.cockpit.buildA}
          value={leftIndex}
          builds={builds}
          onChange={setLeftIndex}
        />
        <BuildPicker
          short={gameCopy.cockpit.buildBShort}
          label={gameCopy.cockpit.buildB}
          value={rightIndex}
          builds={builds}
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
                  {leftEquipped ? gameCopy.cockpit.equippedRow : formatNumber(left.score)}
                </span>
                <span className="text-end font-mono tabular-nums">
                  {rightEquipped ? gameCopy.cockpit.equippedRow : formatNumber(right.score)}
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
                const a = left.finalStats[stat.id] ?? 0;
                const b = right.finalStats[stat.id] ?? 0;
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
  builds,
  onChange,
}: {
  short: string;
  label: string;
  value: number;
  builds: BuildResult[];
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
        {builds.map((build, index) => (
          <option key={`${build.score}-${index}`} value={index}>
            #{index + 1} · {formatNumber(build.score)}
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
