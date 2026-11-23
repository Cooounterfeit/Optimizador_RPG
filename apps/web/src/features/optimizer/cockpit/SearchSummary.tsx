import type { SolveStats } from '@zenith/shared-types';

import { gameCopy } from '../../game/copy';
import {
  badgeFor,
  formatCount,
  formatSeconds,
  prunedPercent,
  type ResultBadge,
} from '../search-summary';

const label: Record<ResultBadge, string> = {
  optimal: gameCopy.cockpit.optimal,
  stopped: gameCopy.cockpit.stopped,
  time: gameCopy.cockpit.hitTimeLimit,
  found: gameCopy.cockpit.bestFound,
};

/**
 * Como se porto la busqueda: el badge dice si el optimo esta demostrado y la
 * linea mono da las cuentas. Es lo que vuelve creible al solver sin pedir fe.
 */
export function SearchSummary({ stats }: { stats: SolveStats }) {
  const badge = badgeFor(stats);
  const optimal = badge === 'optimal';
  const pruned = prunedPercent(stats);

  return (
    <>
      <span
        className={`inline-flex h-5 items-center gap-1.5 rounded-[2px] border px-1.5 font-mono text-[9px] uppercase tracking-[0.1em] ${
          optimal
            ? 'border-[oklch(0.76_0.13_155/0.4)] text-[oklch(0.76_0.13_155)]'
            : 'border-line-strong text-foreground'
        }`}
      >
        {optimal ? (
          <span className="h-[5px] w-[5px] bg-current" aria-hidden="true" />
        ) : null}
        {label[badge]}
      </span>

      <span
        className="ml-auto hidden min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[9.5px] text-muted-foreground min-[1301px]:block"
        title={[
          `${formatCount(stats.totalCombinations)} ${gameCopy.cockpit.possible}`,
          `${formatCount(stats.dominated)} ${gameCopy.cockpit.dominatedItems}`,
          `${formatCount(stats.boundFiltered)} ${gameCopy.cockpit.discardedByBound}`,
          `${formatCount(stats.evaluated)} ${gameCopy.cockpit.evaluatedNow}`,
          formatSeconds(stats.elapsedMs),
        ].join(' · ')}
      >
        <b className="font-normal text-foreground">{formatCount(stats.totalCombinations)}</b>{' '}
        {gameCopy.cockpit.possible} ·{' '}
        <b className="font-normal text-foreground">{pruned}%</b> {gameCopy.cockpit.prunedShare} ·{' '}
        <b className="font-normal text-foreground">{formatCount(stats.evaluated)}</b>{' '}
        {gameCopy.cockpit.evaluatedNow} ·{' '}
        <b className="font-normal text-foreground">{formatSeconds(stats.elapsedMs)}</b>
      </span>
    </>
  );
}
