import type { GameTemplate } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import { cascadeOf, removeStat } from './remove-stat.js';
import { validateTemplate } from './validate.js';

const base: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'x',
  name: 'Juego',
  description: '',
  stats: [
    { id: 'atk', name: 'Ataque', unit: 'flat' },
    { id: 'def', name: 'Defensa', unit: 'flat' },
  ],
  slots: [{ id: 'arma', name: 'Arma' }],
  sets: [],
  derived: [],
  objectives: [
    { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk' },
  ],
  baseProfiles: [{ id: 'p1', name: 'Base', base: { atk: 10, def: 5 } }],
  constrainableStats: [],
};

const con = (parte: Partial<GameTemplate>): GameTemplate => ({ ...base, ...parte });

describe('removeStat: lo que se va entero', () => {
  it('quita la estadistica', () => {
    expect(removeStat(base, 'atk').stats.map((s) => s.id)).toEqual(['def']);
  });

  it('se lleva el objetivo que la usaba, porque ya no se puede evaluar', () => {
    expect(removeStat(base, 'atk').objectives).toEqual([]);
  });

  it('deja en paz lo que no la usaba', () => {
    const t = con({
      objectives: [
        { id: 'dps', name: 'D', description: '', kind: 'linear', formula: 'atk' },
        { id: 'tank', name: 'T', description: '', kind: 'linear', formula: 'def' },
      ],
    });
    expect(removeStat(t, 'atk').objectives.map((o) => o.id)).toEqual(['tank']);
  });

  it('se lleva el derivado que la usaba, por formula o por curva', () => {
    const t = con({
      derived: [
        { id: 'd1', name: 'D1', formula: 'atk * 2' },
        { id: 'd2', name: 'D2', formula: '0', curve: { input: 'atk', points: [[0, 0]] } },
        { id: 'd3', name: 'D3', formula: 'def' },
      ],
    });
    expect(removeStat(t, 'atk').derived.map((d) => d.id)).toEqual(['d3']);
  });

  it('quita el presupuesto y la restringible, que son restricciones', () => {
    const t = con({ constrainableStats: ['atk', 'def'], budgets: [{ statId: 'atk', max: 100 }] });
    const out = removeStat(t, 'atk');
    expect(out.constrainableStats).toEqual(['def']);
    expect(out.budgets).toEqual([]);
  });
});

describe('removeStat: lo que solo pierde una clave', () => {
  it('un conjunto se queda, sin ese efecto', () => {
    const t = con({
      sets: [
        {
          id: 's1',
          name: 'Conjunto',
          tiers: [{ pieces: 2, label: '2pz', effects: { atk: 10, def: 5 } }],
        },
      ],
    });
    const [set] = removeStat(t, 'atk').sets;
    expect(set.id).toBe('s1');
    expect(set.tiers[0].effects).toEqual({ def: 5 });
  });

  it('un personaje se queda, sin ese valor base', () => {
    expect(removeStat(base, 'atk').baseProfiles[0].base).toEqual({ def: 5 });
  });

  it('un nodo de habilidad se queda, sin ese efecto', () => {
    const t = con({
      skillTrees: [
        {
          id: 'a1',
          name: 'Arbol',
          nodes: [{ id: 'n1', name: 'Nodo', effects: { atk: 5, def: 1 } }],
        },
      ],
    });
    expect(removeStat(t, 'atk').skillTrees?.[0].nodes[0].effects).toEqual({ def: 1 });
  });
});

describe('removeStat: la cascada encadena', () => {
  it('un objetivo que usaba el derivado que cayo tambien cae', () => {
    // atk -> d1 -> score. Borrar atk tiene que llevarse los tres.
    const t = con({
      derived: [{ id: 'd1', name: 'D1', formula: 'atk * 2' }],
      objectives: [
        { id: 'score', name: 'S', description: '', kind: 'linear', formula: 'd1 + 1' },
      ],
    });
    expect(cascadeOf(t, 'atk')).toEqual(new Set(['atk', 'd1']));

    const out = removeStat(t, 'atk');
    expect(out.derived).toEqual([]);
    expect(out.objectives).toEqual([]);
  });

  it('la cadena sigue por varios derivados seguidos', () => {
    const t = con({
      derived: [
        { id: 'd1', name: 'D1', formula: 'atk' },
        { id: 'd2', name: 'D2', formula: 'd1 * 2' },
        { id: 'd3', name: 'D3', formula: 'd2 + 1' },
        { id: 'libre', name: 'L', formula: 'def' },
      ],
    });
    expect(cascadeOf(t, 'atk')).toEqual(new Set(['atk', 'd1', 'd2', 'd3']));
    expect(removeStat(t, 'atk').derived.map((d) => d.id)).toEqual(['libre']);
  });
});

describe('removeStat: casos de borde', () => {
  it('una formula ilegible no provoca borrados: ante la duda no se toca', () => {
    const t = con({
      objectives: [{ id: 'roto', name: 'R', description: '', kind: 'linear', formula: 'atk +' }],
    });
    expect(removeStat(t, 'atk').objectives.map((o) => o.id)).toEqual(['roto']);
  });

  it('si era la clave del nivel, el bloque de niveles se va entero', () => {
    const t = con({ leveling: { levelKey: 'atk', min: 1, max: 99, growth: { def: 'atk' } } });
    expect(removeStat(t, 'atk').leveling).toBeUndefined();
  });

  it('si no lo era, solo pierde lo suyo del crecimiento', () => {
    const t = con({
      leveling: {
        levelKey: 'nivel',
        min: 1,
        max: 99,
        growth: { atk: 'nivel', def: 'nivel * 2' },
        mode: 'points',
        points: { attributes: ['atk', 'def'] },
      },
    });
    const out = removeStat(t, 'atk').leveling;
    expect(out?.growth).toEqual({ def: 'nivel * 2' });
    expect(out?.points?.attributes).toEqual(['def']);
  });

  it('borrar algo que no existe no cambia nada', () => {
    expect(removeStat(base, 'fantasma')).toEqual(base);
  });
});

describe('la plantilla resultante es consistente', () => {
  it('no deja ninguna referencia colgando que el validador delate', () => {
    const t = con({
      derived: [{ id: 'd1', name: 'D1', formula: 'atk * 2' }],
      sets: [
        { id: 's1', name: 'S', tiers: [{ pieces: 2, label: '2pz', effects: { atk: 1, def: 2 } }] },
      ],
      constrainableStats: ['atk'],
      budgets: [{ statId: 'atk', max: 10 }],
      objectives: [
        { id: 'score', name: 'S', description: '', kind: 'linear', formula: 'd1 + def' },
        { id: 'tank', name: 'T', description: '', kind: 'linear', formula: 'def' },
      ],
    });

    const out = removeStat(t, 'atk');
    const errores = validateTemplate(out)
      .issues.filter((i) => i.severity === 'error')
      .map((i) => i.code);

    // Nada de "usa X que no existe". Puede faltar algo obligatorio, que es
    // otra cosa y la pantalla ya la avisa.
    expect(errores).not.toContain('E_SET_STAT');
    expect(errores).not.toContain('E_PRESUPUESTO');
    expect(errores).not.toContain('E_FORMULA');
  });
});
