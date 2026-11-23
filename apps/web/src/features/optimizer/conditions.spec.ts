import { describe, expect, it } from 'vitest';

import type { GameTemplate } from '@zenith/shared-types';

import { conditionResults } from './conditions';

const template = {
  stats: [
    { id: 'crit', name: 'CRIT Rate', unit: 'percent' },
    { id: 'atk', name: 'ATK', unit: 'flat' },
  ],
} as unknown as GameTemplate;

describe('conditionResults', () => {
  it('marca cumplido un minimo cuando el valor llega', () => {
    const [row] = conditionResults(template, [{ statId: 'crit', min: 70 }], { crit: 72.4 });

    expect(row.kind).toBe('min');
    expect(row.unit).toBe('%');
    expect(row.met).toBe(true);
  });

  it('marca incumplido un minimo cuando el valor no llega', () => {
    const [row] = conditionResults(template, [{ statId: 'crit', min: 70 }], { crit: 68.1 });

    expect(row.met).toBe(false);
  });

  it('trata el maximo como un techo', () => {
    expect(conditionResults(template, [{ statId: 'atk', max: 2000 }], { atk: 1900 })[0]?.met).toBe(
      true,
    );
    expect(conditionResults(template, [{ statId: 'atk', max: 2000 }], { atk: 2100 })[0]?.met).toBe(
      false,
    );
  });

  it('no rompe sin condiciones ni con stats ausentes', () => {
    expect(conditionResults(template, undefined, {})).toEqual([]);
    expect(conditionResults(template, [{ statId: 'crit', min: 70 }], {})[0]?.actual).toBe(0);
  });
});
