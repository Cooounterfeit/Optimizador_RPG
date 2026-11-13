import { describe, expect, it } from 'vitest';

import type { GameTemplate, Item } from '@zenith/shared-types';

import { conBase } from './evaluar.js';
import { projectProfile } from './leveling.js';
import { solve } from './optimizer.js';

const template = (): GameTemplate => ({
  schemaVersion: '0.1',
  gameId: 'test',
  name: 'Test',
  description: '',
  stats: [{ id: 'atk', name: 'ATK', unit: 'flat' }],
  slots: [{ id: 'a', name: 'A' }],
  sets: [],
  derived: [],
  leveling: { levelKey: 'level', min: 1, max: 90, growth: { atk: '7' } },
  objectives: [
    { id: 'o', name: 'O', description: '', kind: 'nonlinear', formula: 'base_atk + atk', monotonic: true },
  ],
  baseProfiles: [{ id: 'p', name: 'P', base: { level: 1, atk: 100 } }],
  constrainableStats: [],
});

const items: Item[] = [{ id: 'i1', slot: 'a', setId: null, name: 'I1', stats: { atk: 10 } }];

const scoreWith = (t: GameTemplate): number => {
  const result = solve({
    template: t,
    items,
    profileId: 'p',
    objectiveId: 'o',
    constraints: [],
    topN: 1,
  });
  return result.builds[0].score;
};

describe('conBase', () => {
  it('reemplaza la base del perfil en una copia y no muta la original', () => {
    const original = template();
    const next = conBase(original, 'p', { level: 20, atk: 233 });

    expect(next).not.toBe(original);
    expect(next.baseProfiles[0].base).toEqual({ level: 20, atk: 233 });
    expect(original.baseProfiles[0].base).toEqual({ level: 1, atk: 100 });
  });

  it('deja intactos los demas perfiles', () => {
    const original = template();
    original.baseProfiles.push({ id: 'q', name: 'Q', base: { level: 1, atk: 50 } });

    const next = conBase(original, 'p', { level: 20, atk: 233 });

    expect(next.baseProfiles.find((entry) => entry.id === 'q')?.base).toEqual({ level: 1, atk: 50 });
  });
});

describe('coherencia entre la base mostrada y la calculada', () => {
  it('subir de nivel cambia el puntaje cuando la base proyectada viaja en la peticion', () => {
    const t = template();
    const profile = t.baseProfiles[0];
    const projection = projectProfile(t, profile, 20);
    expect(projection.ok).toBe(true);
    if (!projection.ok) return;

    const base = scoreWith(t);
    const leveled = scoreWith(conBase(t, profile.id, projection.base));

    expect(leveled).toBeGreaterThan(base);
    expect(leveled - base).toBeCloseTo(7 * 19, 6);
  });
});
