import { describe, expect, it } from 'vitest';

import type { SolveStats } from '@zenith/shared-types';

import {
  badgeFor,
  formatCount,
  formatSeconds,
  prunedPercent,
} from './search-summary';

const stats = (patch: Partial<SolveStats>): SolveStats =>
  ({ evaluated: 0, totalCombinations: 0, provenOptimal: false, ...patch }) as SolveStats;

describe('search-summary', () => {
  it('cuenta el porcentaje descartado sobre el espacio total', () => {
    expect(prunedPercent(stats({ evaluated: 7251, totalCombinations: 2418904 }))).toBe(99.7);
  });

  it('no divide por cero ni se sale del rango', () => {
    expect(prunedPercent(stats({ evaluated: 0, totalCombinations: 0 }))).toBe(0);
    expect(prunedPercent(stats({ evaluated: 10, totalCombinations: 5 }))).toBe(0);
    expect(prunedPercent(stats({ evaluated: 1, totalCombinations: 3 }))).toBe(66.7);
  });

  it('formatea numeros y segundos', () => {
    expect(formatCount(2418904)).toBe('2,418,904');
    expect(formatCount(undefined)).toBe('0');
    expect(formatSeconds(1800)).toBe('1.8 s');
    expect(formatSeconds(undefined)).toBe('0.0 s');
  });

  it('elige el badge segun como termino la busqueda', () => {
    expect(badgeFor(stats({ provenOptimal: true }))).toBe('optimal');
    expect(badgeFor(stats({ stoppedBy: 'usuario' }))).toBe('stopped');
    expect(badgeFor(stats({ stoppedBy: 'tiempo' }))).toBe('time');
    expect(badgeFor(stats({}))).toBe('found');
  });
});
