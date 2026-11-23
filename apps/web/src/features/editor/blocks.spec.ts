import type { GameTemplate } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import { CONFIG_BLOCKS, missingRequired } from './blocks';
import { buildSkeleton } from './skeleton';

const vacia = buildSkeleton({ name: 'Vacio' }, 'vacio');

const bloque = (id: string) => {
  const found = CONFIG_BLOCKS.find((block) => block.id === id);
  if (!found) throw new Error(`no existe el bloque ${id}`);
  return found;
};

const con = (parte: Partial<GameTemplate>): GameTemplate => ({
  ...vacia,
  ...parte,
});

describe('CONFIG_BLOCKS', () => {
  it('no repite identificadores, que es lo que romperia el registro', () => {
    const ids = CONFIG_BLOCKS.map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('en una plantilla recien creada todas las partes estan vacias', () => {
    for (const block of CONFIG_BLOCKS) {
      expect(block.entries(vacia)).toEqual([]);
    }
  });

  it('describe una estadistica por como se combina, no solo por su nombre', () => {
    const entradas = bloque('stats').entries(
      con({
        stats: [
          { id: 'atk', name: 'Attack', unit: 'flat' },
          {
            id: 'more',
            name: 'More',
            unit: 'percent',
            aggregate: 'multiply',
            group: 'Offense',
          },
        ],
      }),
    );

    expect(entradas[0].detail).toBe('flat · adds up');
    expect(entradas[1].detail).toBe('percent · multiplies · in Offense');
  });

  it('distingue una ranura que puede ir vacia de una que no', () => {
    const entradas = bloque('slots').entries(
      con({
        slots: [
          { id: 'arma', name: 'Weapon' },
          { id: 'casco', name: 'Helmet', optional: true },
        ],
      }),
    );

    expect(entradas[0].detail).toBe('always filled');
    expect(entradas[1].detail).toBe('can be left empty');
  });

  it('delata una estadistica restringible que no existe', () => {
    const entradas = bloque('constrainable').entries(
      con({
        stats: [{ id: 'atk', name: 'Attack', unit: 'flat' }],
        constrainableStats: ['atk', 'fantasma'],
      }),
    );

    expect(entradas[0].name).toBe('Attack');
    expect(entradas[0].detail).toBe('');
    expect(entradas[1].name).toBe('fantasma');
    expect(entradas[1].detail).toBe('no stat with this id');
  });
});

describe('missingRequired', () => {
  it('una plantilla recien creada no puede optimizar todavia', () => {
    const ids = missingRequired(vacia).map((block) => block.id);
    expect(ids).toEqual(['stats', 'slots', 'objectives', 'profiles']);
  });

  it('las partes opcionales nunca aparecen como faltantes', () => {
    const ids = missingRequired(vacia).map((block) => block.id);
    expect(ids).not.toContain('sets');
    expect(ids).not.toContain('derived');
  });

  it('deja de faltar lo que ya se lleno', () => {
    const conStats = con({
      stats: [{ id: 'atk', name: 'Attack', unit: 'flat' }],
    });
    expect(missingRequired(conStats).map((block) => block.id)).not.toContain(
      'stats',
    );
  });
});
