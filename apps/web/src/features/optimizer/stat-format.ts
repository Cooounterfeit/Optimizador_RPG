import type { StatDef } from '@zenith/shared-types';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

type StatLike = Pick<StatDef, 'unit' | 'aggregate'> | undefined;

/** Unidad visible de una estadistica. `multiply` llega como multiplicador. */
export const unitOf = (stat: StatLike): string => {
  if (stat?.aggregate === 'multiply') return '×';
  if (stat?.unit === 'percent') return '%';
  return '';
};

export const formatStat = (value: number, stat: StatLike): string => {
  const formatted = numberFormat.format(value);
  if (stat?.aggregate === 'multiply') return `×${formatted}`;
  return `${formatted}${stat?.unit === 'percent' ? '%' : ''}`;
};

/** Diferencia con signo: `+62`, `−6.4`, o `—` cuando es cero. */
export const formatDelta = (value: number, stat: StatLike): string => {
  if (Math.abs(value) < 1e-9) return '—';
  return `${value > 0 ? '+' : '−'}${formatStat(Math.abs(value), stat)}`;
};

export const formatNumber = (value: number): string => numberFormat.format(value);
