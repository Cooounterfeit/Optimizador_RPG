import { describe, expect, it } from 'vitest';

import type { DamageCalculator } from '@zenith/shared-types';

import { evaluateCalculator } from './calculator.js';

const withCrit: DamageCalculator = {
  title: 'Damage per hit',
  fields: [
    { id: 'attack', label: 'Attack', default: 0, min: 0 },
    { id: 'baseDamage', label: 'Base damage', default: 0, min: 0 },
    { id: 'critDamage', label: 'Additional crit damage', unit: 'percent', default: 0, min: 0 },
    { id: 'critChance', label: 'Crit chance', unit: 'percent', default: 0, min: 0, max: 100 },
    { id: 'defense', label: 'Enemy defense', default: 0, min: 0 },
  ],
  outputs: [
    {
      id: 'withoutCrit',
      label: 'Damage without crit',
      formula: 'max(0, attack + baseDamage - defense)',
    },
    {
      id: 'withCrit',
      label: 'Damage with crit',
      formula: 'max(0, (attack + baseDamage) * (1 + critDamage / 100) - defense)',
    },
    {
      id: 'average',
      label: 'Average damage per hit',
      formula: 'withoutCrit * (1 - critChance / 100) + withCrit * (critChance / 100)',
    },
  ],
};

const noCrit: DamageCalculator = {
  title: 'Hit damage',
  fields: [
    { id: 'attack', label: 'Attack', default: 0, min: 0 },
    { id: 'baseDamage', label: 'Base damage', default: 0, min: 0 },
    { id: 'defense', label: 'Enemy defense', default: 0, min: 0 },
  ],
  outputs: [
    { id: 'hit', label: 'Damage', formula: 'max(0, attack + baseDamage - defense)' },
  ],
};

describe('evaluateCalculator', () => {
  it('evalua las salidas en orden y permite usar las anteriores', () => {
    const result = evaluateCalculator(withCrit, {
      attack: 50,
      baseDamage: 100,
      critDamage: 50,
      critChance: 50,
      defense: 20,
    });

    expect(result.outputs.map((output) => output.value)).toEqual([130, 205, 167.5]);
  });

  it('funciona con un juego que no declara criticos', () => {
    const result = evaluateCalculator(noCrit, { attack: 50, baseDamage: 100, defense: 20 });

    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0].value).toBe(130);
  });

  it('respeta los limites y los valores por defecto del campo', () => {
    const result = evaluateCalculator(withCrit, { attack: 50, critChance: 150 });

    expect(result.outputs[0].value).toBe(50);
    expect(result.outputs[2].value).toBe(50);
  });

  it('no devuelve resultados negativos si la formula usa max(0, ...)', () => {
    const result = evaluateCalculator(noCrit, { attack: 10, defense: 999 });

    expect(result.outputs[0].value).toBe(0);
  });

  it('falla si una salida usa una variable desconocida', () => {
    const invalid: DamageCalculator = {
      title: 'Invalid',
      fields: [{ id: 'attack', label: 'Attack' }],
      outputs: [{ id: 'hit', label: 'Hit', formula: 'attack + critical' }],
    };

    expect(() => evaluateCalculator(invalid, {})).toThrow('Variable desconocida');
  });

  it('falla si una salida se referencia a si misma', () => {
    const invalid: DamageCalculator = {
      title: 'Invalid',
      fields: [{ id: 'attack', label: 'Attack' }],
      outputs: [{ id: 'hit', label: 'Hit', formula: 'hit + 1' }],
    };

    expect(() => evaluateCalculator(invalid, {})).toThrow('Variable desconocida');
  });
});
