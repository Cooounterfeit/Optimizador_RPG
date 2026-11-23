import { describe, expect, it } from 'vitest';

import type { GameTemplate } from '@zenith/shared-types';

import { overBudget, skillPoints } from './skill-points';

const template = (budget?: number) =>
  ({
    skillTrees: [
      {
        id: 'tree',
        name: 'Tree',
        budget,
        nodes: [{ id: 'focus', name: 'Focus', maxRank: 5, cost: 1 }],
      },
    ],
  }) as unknown as GameTemplate;

describe('skillPoints', () => {
  it('suma lo gastado y el tope de los arboles', () => {
    expect(skillPoints(template(5), { focus: 3 })).toEqual({ spent: 3, budget: 5, free: 2 });
  });

  it('sin tope declarado no hay presupuesto', () => {
    expect(skillPoints(template(), { focus: 3 })).toEqual({ spent: 3 });
  });
});

describe('overBudget', () => {
  it('marca cuando la seleccion se pasa', () => {
    expect(overBudget({ spent: 6, budget: 5 })).toEqual({ spent: 6, budget: 5 });
  });

  it('no marca al limite ni sin tope', () => {
    expect(overBudget({ spent: 5, budget: 5 })).toBeNull();
    expect(overBudget({ spent: 6 })).toBeNull();
    expect(overBudget(undefined)).toBeNull();
  });
});
