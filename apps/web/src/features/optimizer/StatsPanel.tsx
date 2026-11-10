import { useEffect, useMemo, useState } from 'react';

import {
  currentLevel,
  futureLevels,
  projectProfile,
} from '@zenith/core-engine';
import type { BaseProfile, GameTemplate } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { gameCopy } from '../game/copy';
import { ItemGlyph } from '../inventory/ItemGlyph';

interface StatsPanelProps {
  template: GameTemplate;
  profile: BaseProfile;
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

export function StatsPanel({ template, profile }: StatsPanelProps) {
  const [order, setOrder] = useState<Order>('value');
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    setTarget(null);
  }, [profile.id]);

  const level = currentLevel(template, profile);
  const levels = futureLevels(template, profile);
  const projection = target === null ? null : projectProfile(template, profile, target);

  useEffect(() => {
    if (target !== null && (level === null || target <= level)) setTarget(null);
  }, [level, target]);

  const rows = useMemo(
    () =>
      template.stats
        .filter((stat) => typeof profile.base[stat.id] === 'number')
        .map((stat) => ({
          stat,
          current: profile.base[stat.id] ?? 0,
          projected: projection?.ok ? projection.base[stat.id] : undefined,
        }))
        .sort((a, b) =>
          order === 'name'
            ? a.stat.name.localeCompare(b.stat.name)
            : b.current - a.current || a.stat.name.localeCompare(b.stat.name),
        ),
    [order, profile, projection, template.stats],
  );

  const projectionMessage = !template.leveling || level === null
    ? gameCopy.cockpit.projectionUnavailable
    : levels.length === 0
      ? gameCopy.cockpit.maxLevel
      : projection && !projection.ok
        ? projection.error
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
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground" htmlFor="future-level">
              {gameCopy.cockpit.futureLevel}
            </label>
            <select
              id="future-level"
              className="h-8 rounded-[2px] border border-line bg-background px-2 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-50"
              value={target ?? ''}
              disabled={levels.length === 0}
              onChange={(event) => setTarget(event.target.value === '' ? null : Number(event.target.value))}
            >
              <option value="">
                {levels.length === 0 ? gameCopy.cockpit.maxLevel : gameCopy.cockpit.chooseLevel}
              </option>
              {levels.map((future) => (
                <option key={future} value={future}>
                  {gameCopy.cockpit.level} {future}
                </option>
              ))}
            </select>
          </div>

          {projectionMessage ? (
            <p role="status" className="mt-2 text-[11px] text-muted-foreground">
              {projectionMessage}
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
                  {projection?.ok ? (
                    <th scope="col" className="px-2 py-1.5 text-right text-[oklch(0.78_0.16_60)]">
                      {gameCopy.cockpit.projected}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ stat, current, projected }) => {
                  const delta = projected === undefined ? 0 : projected - current;
                  return (
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
                        {formatValue(current, stat.unit)}
                      </td>
                      {projection?.ok ? (
                        <td
                          className={cn(
                            'px-2 py-1.5 text-right font-mono tabular-nums',
                            Math.abs(delta) > 1e-9 && 'text-[oklch(0.78_0.16_60)]',
                          )}
                        >
                          {projected === undefined ? '—' : formatValue(projected, stat.unit)}
                          {Math.abs(delta) > 1e-9 ? (
                            <span className="ml-1 text-[10px]">
                              {delta > 0 ? '↑ +' : '↓ '}
                              {numberFormat.format(Math.abs(delta))}
                            </span>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
