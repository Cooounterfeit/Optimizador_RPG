import type { SolveStats } from '@zenith/shared-types';

/** Etiqueta que resume como termino la busqueda. */
export type ResultBadge = 'optimal' | 'stopped' | 'time' | 'found';

const countFormat = new Intl.NumberFormat('en-US');

export const formatCount = (value: number | undefined): string =>
  countFormat.format(Number.isFinite(value) ? (value as number) : 0);

/**
 * Porcentaje de combinaciones que no se evaluaron, respecto del espacio total.
 * Es la cuenta que hace creible al motor: "de 2,4 millones solo mire 7.251".
 */
export function prunedPercent(
  stats: Pick<SolveStats, 'evaluated' | 'totalCombinations'>,
): number {
  const combinations = stats.totalCombinations ?? 0;
  if (!(combinations > 0)) return 0;
  const evaluated = Math.max(0, stats.evaluated ?? 0);
  const share = 100 * (1 - evaluated / combinations);
  if (!Number.isFinite(share)) return 0;
  return Math.min(100, Math.max(0, Math.round(share * 10) / 10));
}

export const formatSeconds = (elapsedMs: number | undefined): string =>
  `${((Number.isFinite(elapsedMs) ? (elapsedMs as number) : 0) / 1000).toFixed(1)} s`;

/** Como termino la busqueda, para el badge del encabezado. */
export function badgeFor(
  stats: Pick<SolveStats, 'provenOptimal' | 'stoppedBy'>,
): ResultBadge {
  if (stats.provenOptimal) return 'optimal';
  if (stats.stoppedBy === 'usuario') return 'stopped';
  if (stats.stoppedBy === 'tiempo') return 'time';
  return 'found';
}
