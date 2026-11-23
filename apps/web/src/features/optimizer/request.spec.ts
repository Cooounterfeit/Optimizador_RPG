import { describe, expect, it } from 'vitest';

import type { GameTemplate, Item, SkillSelection } from '@zenith/shared-types';

import { buildSolveRequest } from './request';

const tree = {
  id: 'tree',
  name: 'Tree',
  budgetAtStart: 0,
  budgetPerLevel: 1,
  nodes: [
    { id: 'focus', name: 'Focus', maxRank: 10, effects: { power: 5 } },
  ],
};

const template = {
  schemaVersion: '0.1',
  gameId: 'g',
  name: 'G',
  description: '',
  stats: [{ id: 'power', name: 'Power', unit: 'flat' }],
  slots: [{ id: 'weapon', name: 'Weapon' }],
  sets: [],
  derived: [],
  objectives: [
    { id: 'damage', name: 'Damage', description: '', kind: 'linear', formula: 'power' },
  ],
  baseProfiles: [{ id: 'p', name: 'P', base: { level: 20, power: 100 } }],
  constrainableStats: [],
  leveling: { levelKey: 'level', min: 1, max: 90, growth: {} },
  skillTrees: [tree],
} as unknown as GameTemplate;

const items: Item[] = [];

const request = (
  skills: SkillSelection = {},
  base: Record<string, number> = { level: 20, power: 100 },
  source: GameTemplate = template,
) =>
  buildSolveRequest({
    template: source,
    profileId: 'p',
    profileBase: base,
    items,
    objectiveId: 'damage',
    constraints: [],
    skills,
  });

describe('buildSolveRequest y presupuesto por nivel', () => {
  it('deriva el presupuesto del nivel de la base efectiva', () => {
    expect(request()!.template.skillTrees?.[0].budget).toBe(19);
    expect(request({}, { level: 4, power: 100 })!.template.skillTrees?.[0].budget).toBe(3);
  });

  it('sanea la seleccion contra el presupuesto derivado', () => {
    expect(request({ focus: 5 }, { level: 3, power: 100 })!.skills).toEqual({ focus: 2 });
  });

  it('una plantilla con presupuesto fijo no cambia', () => {
    const fixed = {
      ...template,
      skillTrees: [{ ...tree, budget: 7, budgetAtStart: undefined, budgetPerLevel: undefined }],
    } as unknown as GameTemplate;

    const result = request({ focus: 3 }, { level: 20, power: 100 }, fixed);
    expect(result!.template.skillTrees?.[0].budget).toBe(7);
    expect(result!.skills).toEqual({ focus: 3 });
  });
});
