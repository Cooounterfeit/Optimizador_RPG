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
import { useLevelHistory } from './useLevelHistory';

interface LevelHistoryPanelProps {
  template: GameTemplate;
  profile: BaseProfile;
  onLevelUp: (base: Record<string, number>) => Promise<void>;
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
  const sign = value > 0 ? '+' : '−';
  return `${sign}${numberFormat.format(Math.abs(value))}${unitOf(unit)}`;
};

export function LevelHistoryPanel({ template, profile, onLevelUp }: LevelHistoryPanelProps) {
  const { history, error: historyError, record } = useLevelHistory(template.gameId, profile.id);
  const [pastLevel, setPastLevel] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = currentLevel(template, profile);
  const pastOptions = useMemo(
    () => (history ?? []).filter((snapshot) => current !== null && snapshot.level < current),
    [history, current],
  );
  const futureOptions = useMemo(() => futureLevels(template, profile), [template, profile]);
  const past = pastOptions.find((snapshot) => snapshot.level === pastLevel);
  const projection = target === null ? null : projectProfile(template, profile, target);
  const futureBase = projection?.ok ? projection.base : null;

  useEffect(() => {
    if (pastLevel !== null && !pastOptions.some((snapshot) => snapshot.level === pastLevel)) {
      setPastLevel(null);
    }
  }, [pastLevel, pastOptions]);

  useEffect(() => {
    if (target !== null && !futureOptions.includes(target)) setTarget(null);
  }, [target, futureOptions]);

  const stats = template.stats.filter((stat) => typeof profile.base[stat.id] === 'number');

  const pastMessage =
    history === null
      ? gameCopy.cockpit.historyLoading
      : current === null
        ? gameCopy.cockpit.historyUnavailable
        : pastOptions.length === 0
          ? history.length === 0
            ? gameCopy.cockpit.noHistory
            : gameCopy.cockpit.noPastLevels
          : !past
            ? gameCopy.cockpit.choosePast
            : null;

  const futureMessage =
    !template.leveling || current === null
      ? gameCopy.cockpit.noFuture
      : futureOptions.length === 0
        ? gameCopy.cockpit.maxLevel
        : target === null
          ? gameCopy.cockpit.chooseFuture
          : projection && !projection.ok
            ? projection.error
            : null;

  const recordCurrent = async () => {
    if (current === null) return;
    setBusy(true);
    setError(null);
    try {
      await record(current, profile.base);
      setMessage(gameCopy.cockpit.recordedLevel);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : gameCopy.cockpit.historyError);
    } finally {
      setBusy(false);
    }
  };

  const levelUp = async () => {
    if (current === null || target === null) return;
    const next = projectProfile(template, profile, target);
    if (!next.ok) {
      setError(next.error);
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await record(current, profile.base);
      for (let level = current + 1; level < target; level += 1) {
        const step = projectProfile(template, profile, level);
        if (step.ok) await record(level, step.base);
      }
      await record(target, next.base);
      await onLevelUp(next.base);
      setTarget(null);
      setPastLevel(null);
      setMessage(gameCopy.cockpit.leveledUp(target));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : gameCopy.cockpit.historyError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[4px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-caps">{gameCopy.cockpit.levelHistory}</p>
        <span className="font-mono text-[10px] text-muted-foreground">
          {current === null ? gameCopy.cockpit.noLevel : `${gameCopy.cockpit.level} ${current}`}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] text-muted-foreground">{gameCopy.cockpit.levelHistoryHint}</p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <button
          type="button"
          className="h-8 rounded-[2px] border border-line px-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-foreground transition-colors hover:border-line-strong disabled:opacity-50"
          disabled={busy || current === null}
          onClick={() => void recordCurrent()}
        >
          {gameCopy.cockpit.recordCurrentLevel}
        </button>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground" htmlFor="history-past-level">
          {gameCopy.cockpit.pastLevel}
        </label>
        <select
          id="history-past-level"
          className="h-8 rounded-[2px] border border-line bg-background px-2 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-50"
          value={pastLevel ?? ''}
          disabled={busy || pastOptions.length === 0}
          onChange={(event) => setPastLevel(event.target.value === '' ? null : Number(event.target.value))}
        >
          <option value="">{gameCopy.cockpit.choosePast}</option>
          {pastOptions.map((snapshot) => (
            <option key={snapshot.level} value={snapshot.level}>
              {gameCopy.cockpit.level} {snapshot.level}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground" htmlFor="history-future-level">
          {gameCopy.cockpit.historyFutureLevel}
        </label>
        <select
          id="history-future-level"
          className="h-8 rounded-[2px] border border-line bg-background px-2 font-mono text-[11px] text-foreground outline-none transition-colors focus:border-line-strong disabled:opacity-50"
          value={target ?? ''}
          disabled={busy || futureOptions.length === 0}
          onChange={(event) => setTarget(event.target.value === '' ? null : Number(event.target.value))}
        >
          <option value="">
            {futureOptions.length === 0 ? gameCopy.cockpit.maxLevel : gameCopy.cockpit.chooseLevel}
          </option>
          {futureOptions.map((level) => (
            <option key={level} value={level}>
              {gameCopy.cockpit.level} {level}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="h-8 rounded-[2px] border border-foreground bg-foreground px-2.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          disabled={busy || target === null}
          onClick={() => void levelUp()}
        >
          {target === null ? gameCopy.cockpit.levelUp : gameCopy.cockpit.levelUpTo(target)}
        </button>
      </div>

      {message ? (
        <p role="status" className="mt-2 text-[11px] text-[oklch(0.72_0.14_150)]">
          {message}
        </p>
      ) : null}
      {error ?? historyError ? (
        <p role="alert" className="mt-2 text-[11px] text-[oklch(0.78_0.16_25)]">
          {error ?? historyError}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Column
          title={past ? `${gameCopy.cockpit.past} · ${gameCopy.cockpit.level} ${past.level}` : gameCopy.cockpit.past}
          tone="past"
          base={past ? { ...profile.base, ...past.base } : null}
          compareBase={profile.base}
          message={pastMessage}
          stats={stats}
        />
        <Column
          title={`${gameCopy.cockpit.present} · ${gameCopy.cockpit.level} ${current ?? '—'}`}
          tone="present"
          base={profile.base}
          compareBase={null}
          message={stats.length === 0 ? gameCopy.cockpit.noStats : null}
          stats={stats}
        />
        <Column
          title={futureBase && target !== null ? `${gameCopy.cockpit.future} · ${gameCopy.cockpit.level} ${target}` : gameCopy.cockpit.future}
          tone="future"
          base={futureBase}
          compareBase={profile.base}
          message={futureMessage}
          stats={stats}
        />
      </div>
    </section>
  );
}

type Tone = 'past' | 'present' | 'future';

function Column({
  title,
  tone,
  base,
  compareBase,
  message,
  stats,
}: {
  title: string;
  tone: Tone;
  base: Record<string, number> | null;
  compareBase: Record<string, number> | null;
  message: string | null;
  stats: GameTemplate['stats'];
}) {
  return (
    <div
      className={cn(
        'rounded-[2px] border p-3',
        tone === 'past' && 'border-[oklch(0.68_0.12_255)]/50',
        tone === 'present' && 'border-line-strong',
        tone === 'future' && 'border-[oklch(0.78_0.16_60)]/50',
      )}
    >
      <p
        className={cn(
          'font-mono text-[9px] uppercase tracking-[0.12em]',
          tone === 'past' && 'text-[oklch(0.68_0.12_255)]',
          tone === 'present' && 'text-foreground',
          tone === 'future' && 'text-[oklch(0.78_0.16_60)]',
        )}
      >
        {title}
      </p>
      {message ? (
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{message}</p>
      ) : base ? (
        <ul className="mt-2 divide-y divide-line">
          {stats.map((stat) => {
            const value = base[stat.id];
            if (typeof value !== 'number') return null;
            const delta = compareBase ? value - (compareBase[stat.id] ?? 0) : 0;
            return (
              <li
                key={stat.id}
                className="flex items-center justify-between gap-2 py-1.5"
                title={`${stat.name}${unitOf(stat.unit) ? ` (${unitOf(stat.unit)})` : ''}`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <ItemGlyph name={stat.name} className="h-5 w-5 text-[7px]" />
                  <span className="truncate text-[11.5px]">{stat.name}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-[11px] tabular-nums">
                  {formatValue(value, stat.unit)}
                  {Math.abs(delta) > 1e-9 ? (
                    <span
                      className={cn(
                        'ml-1 text-[9.5px]',
                        delta > 0 ? 'text-[oklch(0.72_0.14_150)]' : 'text-[oklch(0.7_0.16_25)]',
                      )}
                    >
                      {delta > 0 ? '↑' : '↓'} {formatDelta(delta, stat.unit)}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
