import type { BuildResult, Constraint, GameTemplate, Item } from '@zenith/shared-types';

import { cn } from '../../lib/cn';
import { itemIconUrls } from '../../lib/images';
import { gameCopy } from '../game/copy';
import { ItemGlyph } from '../inventory/ItemGlyph';
import { ItemHoverCard } from '../inventory/ItemHoverCard';
import { conditionResults } from './conditions';
import { formatDelta, formatNumber, formatStat } from './stat-format';

interface BuildRowProps {
  template: GameTemplate;
  build: BuildResult;
  /** Posicion en el ranking; `null` para la build equipada. */
  rank: number | null;
  equipped: boolean;
  /** Build puesta, para los deltas y las condiciones. `null` si no hay nada puesto. */
  baseline: BuildResult | null;
  /** `true` cuando el motor demostro que la #1 es la mejor combinacion. */
  provenOptimal: boolean;
  /** Condiciones con las que corrio la busqueda. */
  constraints: Constraint[] | undefined;
  items: Map<string, Item>;
  open: boolean;
  onToggle: () => void;
  onEquip?: (build: BuildResult) => void;
  profileName?: string;
  evaluated?: number;
  elapsedMs?: number;
}

const MAX_SETS = 2;

/**
 * Una build de la lista: fila compacta y, al abrirla, piezas, stats con su
 * diferencia contra el equipo puesto y las condiciones que cumple. Reemplaza a
 * la tarjeta por build: la lista se lee como tabla, no como pila de cajas.
 */
export function BuildRow({
  template,
  build,
  rank,
  equipped,
  baseline,
  provenOptimal,
  constraints,
  items,
  open,
  onToggle,
  onEquip,
  profileName,
  evaluated,
  elapsedMs,
}: BuildRowProps) {
  const slots = template.slots.map((slot, index) => ({
    slot,
    item: items.get(build.itemIds[index] ?? ''),
  }));
  const delta = baseline ? build.score - baseline.score : undefined;
  const showDelta = baseline !== null;
  const conditions = conditionResults(template, constraints, build.finalStats);
  const visibleStats = template.stats.filter(
    (stat) => Math.abs(build.finalStats[stat.id] ?? 0) > 0.05,
  );
  const sets = build.activeSets.slice(0, MAX_SETS);
  const moreSets = Math.max(0, build.activeSets.length - MAX_SETS);
  const panelId = `build-${rank ?? 'equipped'}-panel`;

  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={rank === null ? gameCopy.cockpit.equippedRow : `#${rank}`}
        className={cn(
          'grid w-full grid-cols-[12px_22px_1fr_auto] items-center gap-x-2.5 gap-y-1.5 px-4 py-2.5 text-left transition-colors hover:bg-raised',
          'min-[861px]:h-[46px] min-[861px]:grid-cols-[12px_24px_96px_72px_minmax(0,1fr)_auto_84px] min-[861px]:py-0',
          open && 'bg-raised shadow-[inset_2px_0_0_var(--color-foreground)]',
          equipped && open && 'shadow-[inset_2px_0_0_var(--color-line-strong)]',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex text-muted-foreground transition-transform duration-150',
            open && 'rotate-90 text-foreground',
          )}
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 5l5 5-5 5" />
          </svg>
        </span>

        <span className="font-mono text-[10.5px] text-muted-foreground">
          {rank === null ? '—' : String(rank).padStart(2, '0')}
        </span>

        <span className="font-mono text-[14.5px] font-semibold tabular-nums">
          {formatNumber(build.score)}
        </span>

        <span
          className={cn(
            'text-end font-mono text-[11px] tabular-nums',
            delta === undefined || Math.abs(delta) < 1e-9
              ? 'text-muted-foreground'
              : delta > 0
                ? 'text-[oklch(0.72_0.14_150)]'
                : 'text-[oklch(0.72_0.14_25)]',
          )}
        >
          {delta === undefined || Math.abs(delta) < 1e-9
            ? '—'
            : `${delta > 0 ? '+' : '−'}${formatNumber(Math.abs(delta))}`}
        </span>

        <span className="col-span-full flex gap-1 min-[861px]:col-auto">
          {slots.map(({ slot, item }) => (
            <ItemHoverCard
              key={slot.id}
              as="span"
              className="grid h-[22px] w-[22px] place-items-center rounded-[2px] bg-muted text-muted-foreground"
              template={template}
              item={item}
            >
              {item ? (
                <ItemGlyph
                  name={item.name}
                  sources={itemIconUrls(template.assets, item)}
                  className="h-[22px] w-[22px] rounded-[2px] border-0 text-[7px]"
                />
              ) : (
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              )}
            </ItemHoverCard>
          ))}
        </span>

        <span className="hidden gap-1 min-[861px]:flex">
          {sets.map((set) => (
            <span
              key={set.setId}
              className="inline-flex h-[19px] items-center rounded-[2px] bg-muted px-1.5 font-mono text-[9.5px] whitespace-nowrap"
            >
              {set.pieces}× {set.name}
            </span>
          ))}
          {moreSets > 0 ? (
            <span className="inline-flex h-[19px] items-center rounded-[2px] bg-muted px-1.5 font-mono text-[9.5px]">
              +{moreSets}
            </span>
          ) : null}
        </span>

        <span
          className={cn(
            'hidden text-end font-mono text-[9px] uppercase tracking-[0.08em] min-[861px]:block',
            equipped
              ? 'text-foreground'
              : rank === 1 && provenOptimal
                ? 'text-[oklch(0.76_0.13_155)]'
                : 'text-muted-foreground',
          )}
        >
          {equipped
            ? gameCopy.cockpit.equippedRow
            : rank === 1 && provenOptimal
              ? gameCopy.cockpit.optimal
              : ''}
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-label={`${rank === null ? gameCopy.cockpit.equippedRow : `#${rank}`} build details`}
        hidden={!open}
      >
        <div className="grid grid-cols-1 gap-2.5 p-2.5 pt-0 min-[861px]:grid-cols-2 min-[1081px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_280px]">
          <div className="min-w-0 rounded-[4px] border border-line bg-background p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2.5">
              <span className="label-caps">{gameCopy.cockpit.pieces}</span>
              <span className="label-caps">{build.itemIds.filter(Boolean).length}</span>
            </div>

            <div className="flex flex-col">
              {slots.map(({ slot, item }) => (
                <ItemHoverCard
                  key={slot.id}
                  as="div"
                  className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 py-[7px]"
                  template={template}
                  item={item}
                >
                  <ItemGlyph
                    name={item?.name ?? slot.name}
                    rarity={item?.rarity}
                    sources={item ? itemIconUrls(template.assets, item) : []}
                    className="h-[22px] w-[22px] text-[7px]"
                  />
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[12px] font-semibold leading-tight">
                      {item?.name ?? gameCopy.cockpit.emptySlot}
                    </p>
                    <p className="m-0 truncate font-mono text-[9px] text-muted-foreground">
                      {slot.name}
                      {item?.level === undefined ? '' : ` · Lv. ${item.level}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-end font-mono text-[10px] leading-snug text-muted-foreground">
                    {item
                      ? Object.entries(item.stats)
                          .slice(0, 2)
                          .map(([statId, value]) => {
                            const stat = template.stats.find((entry) => entry.id === statId);
                            return (
                              <b key={statId} className="block font-normal text-foreground">
                                {formatStat(value, stat)} {stat?.name ?? statId}
                              </b>
                            );
                          })
                      : null}
                  </span>
                </ItemHoverCard>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-[4px] border border-line bg-background p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2.5">
              <span className="label-caps">{gameCopy.cockpit.currentStats}</span>
              {showDelta ? (
                <span className="label-caps">{gameCopy.cockpit.deltaEquipped}</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              {visibleStats.map((stat) => {
                const value = build.finalStats[stat.id] ?? 0;
                const diff = baseline ? value - (baseline.finalStats[stat.id] ?? 0) : undefined;
                return (
                  <div
                    key={stat.id}
                    className={`grid items-baseline gap-2 text-[12px] ${
                      showDelta
                        ? 'grid-cols-[minmax(0,1fr)_76px_56px]'
                        : 'grid-cols-[minmax(0,1fr)_76px]'
                    }`}
                  >
                    <span className="truncate text-muted-foreground">{stat.name}</span>
                    <span className="text-end font-mono text-[12px] tabular-nums">
                      {formatStat(value, stat)}
                    </span>
                    {showDelta ? (
                      <span
                        className={cn(
                          'text-end font-mono text-[10.5px] tabular-nums',
                          diff === undefined || Math.abs(diff) < 1e-9
                            ? 'text-muted-foreground'
                            : diff > 0
                              ? 'text-[oklch(0.72_0.14_150)]'
                              : 'text-[oklch(0.72_0.14_25)]',
                        )}
                      >
                        {diff === undefined ? '—' : formatDelta(diff, stat)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {conditions.length > 0 ? (
              <div className="mt-2.5 flex flex-col gap-1 border-t border-line pt-2">
                {conditions.map((condition) => (
                  <div
                    key={`${condition.statId}-${condition.kind}`}
                    className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-baseline gap-2 text-[11.5px]"
                    title={
                      condition.met
                        ? gameCopy.cockpit.conditionMet
                        : gameCopy.cockpit.conditionMissed
                    }
                  >
                    <span
                      className={cn(
                        'font-mono text-[10px]',
                        condition.met
                          ? 'text-[oklch(0.72_0.14_150)]'
                          : 'text-[oklch(0.72_0.14_25)]',
                      )}
                      aria-hidden="true"
                    >
                      {condition.met ? '✓' : '✕'}
                    </span>
                    <span className="min-w-0 truncate text-muted-foreground">
                      {condition.name} ·{' '}
                      {condition.kind === 'max'
                        ? gameCopy.cockpit.constraintMost
                        : gameCopy.cockpit.constraintLeast}{' '}
                      {formatStat(condition.limit, template.stats.find((s) => s.id === condition.statId))}
                    </span>
                    <span className="text-end font-mono text-[10.5px] tabular-nums">
                      {formatStat(
                        condition.actual,
                        template.stats.find((s) => s.id === condition.statId),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col rounded-[4px] border border-line bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="label-caps">{gameCopy.cockpit.score}</span>
              <span className="rounded-[2px] border border-line px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">
                {gameCopy.cockpit.scoreWip}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {gameCopy.cockpit.scoreWipNote}
            </p>

            {equipped ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {profileName
                  ? gameCopy.cockpit.alreadyOn(profileName)
                  : gameCopy.cockpit.equippedRow}
              </p>
            ) : onEquip ? (
              <button
                type="button"
                onClick={() => onEquip(build)}
                className="mt-2 inline-flex h-8 items-center justify-center rounded-[2px] border border-transparent bg-primary px-3 text-[12.5px] font-bold text-primary-foreground transition-colors hover:bg-[oklch(0.99_0_0)] active:scale-[0.98]"
              >
                {gameCopy.cockpit.equip}
              </button>
            ) : null}

            {evaluated === undefined ? null : (
              <p className="mt-auto pt-3 font-mono text-[9px] text-muted-foreground">
                {formatNumber(evaluated)} {gameCopy.cockpit.evaluatedNow} ·{' '}
                {((elapsedMs ?? 0) / 1000).toFixed(1)} s
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
