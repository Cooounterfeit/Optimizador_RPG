import { describe, expect, it } from 'vitest';

import type { Evaluacion } from '@zenith/core-engine';
import type { Equipment, GameTemplate } from '@zenith/shared-types';

import { equippedBuild, hasEquipped } from './equipped-build';

const template = {
  slots: [{ id: 'weapon', name: 'Weapon' }, { id: 'relic', name: 'Relic' }],
  sets: [{ id: 'ember', name: 'Ember', tiers: [] }],
} as unknown as GameTemplate;

const evaluation = {
  finalStats: { power: 1942 },
  objetivos: { damage: 62205, sustain: 1000 },
  conjuntos: [{ name: 'Ember', pieces: 2, tiers: ['2 pieces'] }],
} as unknown as Evaluacion;

describe('equipped-build', () => {
  it('arma la build en el orden de las ranuras, con ranuras vacias', () => {
    const equipment: Equipment = { relic: 'sigil' };
    const build = equippedBuild(template, equipment, evaluation, 'damage');

    expect(build?.itemIds).toEqual(['', 'sigil']);
  });

  it('toma el puntaje del objetivo pedido y sus stats', () => {
    const build = equippedBuild(template, {}, evaluation, 'sustain');

    expect(build?.score).toBe(1000);
    expect(build?.finalStats).toEqual({ power: 1942 });
  });

  it('traduce los conjuntos a la forma de un resultado', () => {
    const build = equippedBuild(template, {}, evaluation, 'damage');

    expect(build?.activeSets).toEqual([
      { setId: 'ember', name: 'Ember', pieces: 2, tiers: ['2 pieces'] },
    ]);
  });

  it('no inventa una build cuando falta la evaluacion o el objetivo', () => {
    expect(equippedBuild(template, {}, null, 'damage')).toBeNull();

    const another = { ...evaluation, objetivos: {} } as unknown as Evaluacion;
    expect(equippedBuild(template, {}, another, 'damage')).toBeNull();
  });

  it('detecta si hay algo puesto', () => {
    expect(hasEquipped({ weapon: '', relic: '' })).toBe(false);
    expect(hasEquipped({ weapon: 'pike' })).toBe(true);
  });
});
