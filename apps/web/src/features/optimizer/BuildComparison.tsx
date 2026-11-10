import { useEffect, useState } from 'react';

import type { BuildResult, GameTemplate } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { gameCopy } from '../game/copy';

interface BuildComparisonProps {
  template: GameTemplate;
  objective: GameTemplate['objectives'][number];
  builds: BuildResult[];
}

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

const formatDelta = (value: number, unit: string | undefined): string => {
  if (Math.abs(value) < 1e-9) return '—';
  return `${value > 0 ? '+' : '−'}${numberFormat.format(Math.abs(value))}${unitOf(unit)}`;
};

export function BuildComparison({ template, objective, builds }: BuildComparisonProps) {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);

  useEffect(() => {
    if (leftIndex >= builds.length) setLeftIndex(0);
    if (rightIndex >= builds.length) setRightIndex(builds.length > 1 ? 1 : 0);
  }, [builds.length, leftIndex, rightIndex]);

  if (builds.length < 2) {
    return (
      <section className="mt-4 rounded-[4px] border border-line bg-surface p-5">
        <p className="label-caps">{gameCopy.cockpit.compareBuilds}</p>
        <p className="mt-2 text-[12.5px] text-muted-foreground">{gameCopy.cockpit.onlyOneBuild}</p>
      </section>
    );
  }

  const left = builds[leftIndex] ?? builds[0];
  const right = builds[rightIndex] ?? builds[1];
  if (!left || !right) return null;
  const identical = left.itemIds.join('|') === right.itemIds.join('|');
  const stats = template.stats.filter(
    (stat) =>
      Math.abs(left.finalStats[stat.id] ?? 0) > 0.05 ||
      Math.abs(right.finalStats[stat.id] ?? 0) > 0.05,
  );

  return (
    <section className="mt-4 rounded-[4px] border border-line bg-surface p-5">
      <p className="label-caps">{gameCopy.cockpit.compareBuilds}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <BuildPicker
          label={gameCopy.cockpit.buildA}
          value={leftIndex}
          builds={builds}
          onChange={setLeftIndex}
        />
        <BuildPicker
          label={gameCopy.cockpit.buildB}
          value={rightIndex}
          builds={builds}
          onChange={setRightIndex}
        />
      </div>

      {identical ? (
        <p role="status" className="mt-3 text-[12px] text-muted-foreground">
          {gameCopy.cockpit.identicalBuilds}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                <th scope="col" className="py-1.5 pr-3 font-normal">
                  {gameCopy.cockpit.stat}
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-normal">
                  {gameCopy.cockpit.buildA}
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-normal">
                  {gameCopy.cockpit.buildB}
                </th>
                <th scope="col" className="py-1.5 pl-3 text-right font-normal">
                  {gameCopy.cockpit.difference}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">
                  {objective.name}
                </th>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {numberFormat.format(left.score)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {numberFormat.format(right.score)}
                </td>
                <td
                  className={cn(
                    'py-2 pl-3 text-right font-mono tabular-nums',
                    right.score > left.score && 'text-[oklch(0.72_0.14_150)]',
                    right.score < left.score && 'text-[oklch(0.7_0.16_25)]',
                  )}
                >
                  {formatDelta(right.score - left.score, objective.unit)}
                </td>
              </tr>
              {stats.map((stat) => {
                const a = left.finalStats[stat.id] ?? 0;
                const b = right.finalStats[stat.id] ?? 0;
                return (
                  <tr key={stat.id} className="border-b border-line last:border-b-0">
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                      {stat.name}
                    </th>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                      {formatValue(a, stat.unit)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                      {formatValue(b, stat.unit)}
                    </td>
                    <td
                      className={cn(
                        'py-1.5 pl-3 text-right font-mono tabular-nums',
                        b > a && 'text-[oklch(0.72_0.14_150)]',
                        b < a && 'text-[oklch(0.7_0.16_25)]',
                      )}
                    >
                      {formatDelta(b - a, stat.unit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BuildPicker({
  label,
  value,
  builds,
  onChange,
}: {
  label: string;
  value: number;
  builds: BuildResult[];
  onChange: (index: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span className="shrink-0">{label}</span>
      <select
        className="h-8 min-w-0 flex-1 rounded-[2px] border border-line bg-background px-2 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-line-strong"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {builds.map((build, index) => (
          <option key={`${build.score}-${index}`} value={index}>
            #{index + 1} · {numberFormat.format(build.score)}
          </option>
        ))}
      </select>
    </label>
  );
}
