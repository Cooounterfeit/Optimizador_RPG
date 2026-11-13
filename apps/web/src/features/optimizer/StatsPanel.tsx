import { useMemo, useState } from 'react';

import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { gameCopy } from '../game/copy';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { useSetLevel } from './useSetLevel';

interface StatsPanelProps {
  template: GameTemplate;
  profile: BaseProfile;
  onSaveBase?: (base: Record<string, number>) => Promise<void> | void;
}

type Order = 'value' | 'name';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const unitOf = (unit: string | undefined): string => {
  if (unit === 'percent') return '%';
  if (unit === 'multiply') return '×';
  return '';
};

const formatValue = (value: number, unit: string | undefined): string =>
  unit === 'multiply'
    ? `×${numberFormat.format(value)}`
    : `${numberFormat.format(value)}${unitOf(unit)}`;

export function StatsPanel({ template, profile, onSaveBase }: StatsPanelProps) {
  const [order, setOrder] = useState<Order>('value');
  const {
    current: level,
    levels,
    canSet,
    pointsMode,
    saving,
    error,
    setLevel,
  } = useSetLevel({ template, profile, onSave: onSaveBase ?? (() => undefined) });
  const [saved, setSaved] = useState<number | null>(null);

  const rows = useMemo(
    () =>
      template.stats
        .filter((stat) => typeof profile.base[stat.id] === 'number')
        .map((stat) => ({ stat, value: profile.base[stat.id] ?? 0 }))
        .sort((a, b) =>
          order === 'name'
            ? a.stat.name.localeCompare(b.stat.name)
            : b.value - a.value || a.stat.name.localeCompare(b.stat.name),
        ),
    [order, profile.base, template.stats],
  );

  const levelMessage = pointsMode
    ? gameCopy.cockpit.levelPointsMode
    : !canSet
      ? gameCopy.cockpit.levelsUnavailable
      : null;

  return (
    <section className="rounded-[4px] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="label-caps">{gameCopy.cockpit.currentStats}</p>
        <span className="font-mono text-[10px] text-muted-foreground">
          {level === null ? gameCopy.cockpit.noLevel : `${gameCopy.cockpit.level} ${level}`}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.statsHint}</p>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-[2px] border border-dashed border-line-strong px-3 py-2 text-[12px] text-muted-foreground">
          {gameCopy.cockpit.noStats}
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              htmlFor="character-level"
            >
              {gameCopy.cockpit.characterLevel}
            </label>
            <select
              id="character-level"
              className="h-8 rounded-[2px] border border-line bg-background px-2 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-50"
              value={level ?? ''}
              disabled={!canSet || saving || !onSaveBase}
              onChange={(event) => {
                const next = Number(event.target.value);
                void setLevel(next).then((ok) => {
                  if (ok) setSaved(next);
                });
              }}
            >
              {levels.map((option) => (
                <option key={option} value={option}>
                  {gameCopy.cockpit.level} {option}
                </option>
              ))}
            </select>
          </div>

          {levelMessage ? (
            <p role="status" className="mt-2 text-[11px] text-muted-foreground">
              {levelMessage}
            </p>
          ) : null}
          {saved !== null && !levelMessage ? (
            <p role="status" className="mt-2 text-[11px] text-[oklch(0.72_0.14_150)]">
              {gameCopy.cockpit.levelSet(saved)}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-[11px] text-[oklch(0.78_0.16_25)]">
              {error}
            </p>
          ) : null}

          <div className="mt-3 overflow-hidden rounded-[2px] border border-line">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line bg-raised text-left font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th scope="col" className="px-2 py-1.5">
                    <button
                      type="button"
                      className="cursor-pointer text-left hover:text-foreground"
                      title={order === 'name' ? gameCopy.cockpit.sortByValue : gameCopy.cockpit.sortByName}
                      onClick={() => setOrder(order === 'name' ? 'value' : 'name')}
                    >
                      {gameCopy.cockpit.stat} {order === 'name' ? 'A→Z' : '↓'}
                    </button>
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right">
                    {gameCopy.cockpit.current}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ stat, value }) => (
                  <tr
                    key={stat.id}
                    className="border-b border-line last:border-b-0"
                    title={`${stat.name}${unitOf(stat.unit) ? ` (${unitOf(stat.unit)})` : ''}`}
                  >
                    <th scope="row" aria-label={stat.name} className="px-2 py-1.5 text-left font-normal">
                      <span className="flex items-center gap-2">
                        <ItemGlyph name={stat.name} className="h-6 w-6 text-[8px]" />
                        <span className="truncate">{stat.name}</span>
                      </span>
                    </th>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {formatValue(value, stat.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
