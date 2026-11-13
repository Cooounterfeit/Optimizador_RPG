import type { Evaluacion } from '@zenith/core-engine';
import type { BaseProfile, Equipment, GameTemplate, Item } from '@zenith/shared-types';

import { sheetCopy } from './copy';

interface SheetStatsProps {
  template: GameTemplate;
  profile: BaseProfile;
  equipment: Equipment;
  itemsById: Map<string, Item>;
  evaluation: Evaluacion | null;
  evaluating: boolean;
  error: string | null;
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const formatStat = (value: number, unit: string | undefined): string => {
  if (unit === 'multiply') return `×${numberFormat.format(value)}`;
  if (unit === 'percent') return `${numberFormat.format(value)}%`;
  return `${numberFormat.format(value)}${unit ?? ''}`;
};

const formatObjective = (value: number, decimals: number | undefined, unit: string | undefined) =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals ?? 1 }).format(value)}${unit ?? ''}`;

/** Agrupa conservando el orden en que aparecen los grupos en la plantilla. */
const byGroup = <T,>(rows: T[], groupOf: (row: T) => string): [string, T[]][] => {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = groupOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()];
};

/**
 * La foto del personaje con lo que tiene puesto: avisos, objetivos, stats
 * agrupadas, calculados y conjuntos. Todo sale de `evaluar`; aqui no se guarda
 * ni se recalcula nada por cuenta propia.
 */
export function SheetStats({
  template,
  profile,
  equipment,
  itemsById,
  evaluation,
  evaluating,
  error,
}: SheetStatsProps) {
  const requirements = template.requirementsFrom === 'final' ? 'final' : 'base';
  const unmet = template.slots.flatMap((slot) => {
    const item = itemsById.get(equipment[slot.id] ?? '');
    if (!item?.requires) return [];
    return Object.entries(item.requires)
      .filter(([statId, need]) => {
        const value =
          requirements === 'final'
            ? (evaluation?.finalStats[statId] ?? 0)
            : (profile.base[statId] ?? 0);
        return value < need;
      })
      .map(([statId, need]) => {
        const label =
          template.stats.find((stat) => stat.id === statId)?.name ??
          profile.labels?.[statId] ??
          statId;
        return sheetCopy.requirement(item.name, String(need), label);
      });
  });

  const overBudget = (template.budgets ?? []).flatMap((budget) => {
    if (!evaluation) return [];
    const used =
      (evaluation.finalStats[budget.statId] ?? 0) - (profile.base[budget.statId] ?? 0);
    if (used <= budget.max) return [];
    const label =
      budget.name ?? template.stats.find((stat) => stat.id === budget.statId)?.name ?? budget.statId;
    return [sheetCopy.budget(label, numberFormat.format(used), numberFormat.format(budget.max))];
  });

  const statGroups = byGroup(template.stats, (stat) => stat.group ?? sheetCopy.stats);
  const derivedGroups = byGroup(template.derived ?? [], (entry) => entry.group ?? sheetCopy.derived);

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-caps m-0">{sheetCopy.score}</p>
        {evaluating ? (
          <span role="status" className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {sheetCopy.calculating}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[11.5px] text-[oklch(0.78_0.16_25)]">
          {error}
        </p>
      ) : null}

      {unmet.length > 0 || overBudget.length > 0 ? (
        <div
          role="status"
          className="mt-3 rounded-[2px] border border-[oklch(0.78_0.16_60)]/50 px-3 py-2"
        >
          {unmet.length > 0 ? (
            <>
              <p className="m-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[oklch(0.78_0.16_60)]">
                {sheetCopy.requirementsTitle}
              </p>
              <ul className="m-0 mt-1 list-none p-0 text-[11.5px] leading-snug text-muted-foreground">
                {unmet.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </>
          ) : null}
          {overBudget.length > 0 ? (
            <>
              <p className="m-0 mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[oklch(0.78_0.16_60)]">
                {sheetCopy.budgetTitle}
              </p>
              <ul className="m-0 mt-1 list-none p-0 text-[11.5px] leading-snug text-muted-foreground">
                {overBudget.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {evaluation ? (
        <div className="mt-3">
          <p className="label-caps m-0">{sheetCopy.objectives}</p>
          <ul className="m-0 mt-1 list-none divide-y divide-line p-0">
            {template.objectives.map((objective) => {
              const value = evaluation.objetivos[objective.id];
              if (value === undefined) return null;
              return (
                <li
                  key={objective.id}
                  className="flex items-baseline justify-between gap-3 py-1.5"
                >
                  <span className="min-w-0 truncate text-[12.5px]">{objective.name}</span>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums">
                    {formatObjective(value, objective.decimals, objective.unit)}
                  </span>
                </li>
              );
            })}
          </ul>

          {statGroups.map(([group, stats]) => (
            <div key={group} className="mt-4">
              <p className="label-caps m-0">{group}</p>
              <ul className="m-0 mt-1 list-none divide-y divide-line p-0">
                {stats.map((stat) => (
                  <li key={stat.id} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-[12.5px] text-muted-foreground">
                      {stat.name}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] tabular-nums">
                      {formatStat(
                        evaluation.finalStats[stat.id] ?? 0,
                        stat.unit === 'flat' ? '' : stat.unit,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {derivedGroups.map(([group, entries]) => (
            <div key={group} className="mt-4">
              <p className="label-caps m-0">{group}</p>
              <ul className="m-0 mt-1 list-none divide-y divide-line p-0">
                {entries.map((entry) => {
                  const value = evaluation.vars.get(entry.id);
                  if (value === undefined) return null;
                  return (
                    <li key={entry.id} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate text-[12.5px] text-muted-foreground">
                        {entry.name || entry.id}
                      </span>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums">
                        {formatStat(value, entry.unit)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="mt-4">
            <p className="label-caps m-0">{sheetCopy.sets}</p>
            {evaluation.conjuntos.length === 0 ? (
              <p className="m-0 mt-1 text-[11.5px] text-muted-foreground">{sheetCopy.noSets}</p>
            ) : (
              <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
                {evaluation.conjuntos.map((set) => (
                  <li
                    key={set.name}
                    className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {set.name} · {set.pieces} · {set.tiers.join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-[120px]" />
      )}
    </section>
  );
}
