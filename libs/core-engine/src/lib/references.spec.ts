import type { GameTemplate, Item } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import { statInUse, statReferences } from './references.js';

/**
 * Lo minimo que valida, con dos estadisticas cuyos ids se parecen a proposito:
 * `atk` y `atk_pct`. Buscando por texto, borrar la primera creeria que la
 * segunda la usa.
 */
const base: GameTemplate = {
  schemaVersion: '0.1',
  gameId: 'x',
  name: 'Juego',
  description: '',
  stats: [
    { id: 'atk', name: 'Ataque', unit: 'flat' },
    { id: 'atk_pct', name: 'Ataque porcentual', unit: 'percent' },
  ],
  slots: [{ id: 'arma', name: 'Arma' }],
  sets: [],
  derived: [],
  objectives: [
    { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk_pct * 2' },
  ],
  baseProfiles: [{ id: 'p1', name: 'Base', base: {} }],
  constrainableStats: [],
};

const con = (parte: Partial<GameTemplate>): GameTemplate => ({ ...base, ...parte });

const kinds = (t: GameTemplate, statId: string, items?: Item[]) =>
  statReferences(t, statId, items).refs.map((ref) => `${ref.kind}:${ref.where}`);

const pieza = (parte: Partial<Item>): Item => ({
  id: 'i1',
  slot: 'arma',
  setId: null,
  name: 'Espada',
  stats: {},
  ...parte,
});

describe('statReferences: formulas', () => {
  it('no confunde una estadistica con otra cuyo id la contiene', () => {
    // El objetivo usa atk_pct, no atk. Por texto, "atk" aparece en los dos.
    expect(kinds(base, 'atk')).toEqual([]);
    expect(kinds(base, 'atk_pct')).toEqual(['objective:dps']);
  });

  it('un objetivo que usa el valor final se rompe al borrar', () => {
    const t = con({
      objectives: [{ id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk' }],
    });
    const [ref] = statReferences(t, 'atk').refs;
    expect(ref.kind).toBe('objective');
    expect(ref.breaks).toBe(true);
  });

  it('si solo usa base_ y el primer perfil conserva la clave, NO se rompe', () => {
    // Al dejar de ser estadistica declarada, la clave del perfil pasa a ser una
    // clave suelta que el motor sigue exponiendo como base_atk.
    const t = con({
      objectives: [
        { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'base_atk * 2' },
      ],
      baseProfiles: [{ id: 'p1', name: 'Base', base: { atk: 10 } }],
    });
    const objetivo = statReferences(t, 'atk').refs.find((ref) => ref.kind === 'objective');
    expect(objetivo?.breaks).toBe(false);
  });

  it('si usa base_ y el primer perfil no tiene la clave, si se rompe', () => {
    const t = con({
      objectives: [
        { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'base_atk * 2' },
      ],
    });
    expect(statReferences(t, 'atk').refs[0].breaks).toBe(true);
  });

  it('solo cuenta el PRIMER perfil, que es de donde salen las claves sueltas', () => {
    const t = con({
      objectives: [
        { id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'base_atk' },
      ],
      baseProfiles: [
        { id: 'p1', name: 'Primero', base: {} },
        { id: 'p2', name: 'Segundo', base: { atk: 10 } },
      ],
    });
    expect(statReferences(t, 'atk').refs[0].breaks).toBe(true);
  });

  it('una formula ilegible no se da por buena ni por mala', () => {
    const t = con({
      objectives: [{ id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk +' }],
    });
    const { refs, unreadable } = statReferences(t, 'atk');
    expect(refs).toEqual([]);
    expect(unreadable).toEqual([{ kind: 'objective', where: 'dps' }]);
  });

  it('un derivado cuenta por su formula y por la entrada de su curva', () => {
    const porFormula = con({ derived: [{ id: 'd1', name: 'D', formula: 'atk / 2' }] });
    expect(kinds(porFormula, 'atk')).toEqual(['derived:d1']);

    const porCurva = con({
      derived: [
        { id: 'd1', name: 'D', formula: '0', curve: { input: 'atk', points: [[0, 0]] } },
      ],
    });
    expect(statReferences(porCurva, 'atk').refs[0].breaks).toBe(true);
  });
});

describe('statReferences: el resto de la plantilla', () => {
  it('una clave del perfil no rompe, porque sobrevive como clave suelta', () => {
    const t = con({ baseProfiles: [{ id: 'p1', name: 'Base', base: { atk: 10 } }] });
    const [ref] = statReferences(t, 'atk').refs;
    expect(ref).toMatchObject({ kind: 'profile', where: 'p1', breaks: false });
  });

  it('una restringible deja un id colgando, que el motor avisa y descarta', () => {
    const t = con({ constrainableStats: ['atk'] });
    expect(statReferences(t, 'atk').refs[0]).toMatchObject({
      kind: 'constrainable',
      breaks: false,
    });
  });

  it('un presupuesto rompe, porque el motor emite E_PRESUPUESTO', () => {
    const t = con({ budgets: [{ statId: 'atk', max: 100 }] });
    expect(statReferences(t, 'atk').refs[0]).toMatchObject({ kind: 'budget', breaks: true });
  });

  it('un conjunto rompe, y sale una vez aunque este en dos escalones', () => {
    const t = con({
      sets: [
        {
          id: 's1',
          name: 'Conjunto',
          tiers: [
            { pieces: 2, label: '2pz', effects: { atk: 10 } },
            { pieces: 4, label: '4pz', effects: { atk: 20 } },
          ],
        },
      ],
    });
    const { refs } = statReferences(t, 'atk');
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ kind: 'set', where: 's1', breaks: true });
  });

  it('la clave del nivel rompe, porque la usan las formulas de crecimiento', () => {
    const t = con({ leveling: { levelKey: 'atk', min: 1, max: 99, growth: {} } });
    expect(statReferences(t, 'atk').refs[0]).toMatchObject({
      kind: 'leveling',
      where: 'levelKey',
      breaks: true,
    });
  });

  it('en crecimiento, el aviso escala a roto y no se queda en el primero', () => {
    // `atk` es a la vez la clave que crece y una variable de su propia formula.
    // Las dos caen en la misma entrada, y la grave manda.
    const t = con({
      leveling: { levelKey: 'nivel', min: 1, max: 99, growth: { atk: 'atk * nivel' } },
    });
    const { refs } = statReferences(t, 'atk');
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ where: 'growth.atk', breaks: true });
  });

  it('los puntos por nivel cuentan sin romper', () => {
    const t = con({
      leveling: {
        levelKey: 'nivel',
        min: 1,
        max: 99,
        growth: {},
        mode: 'points',
        points: { attributes: ['atk'] },
      },
    });
    expect(statReferences(t, 'atk').refs[0]).toMatchObject({
      where: 'points.attributes',
      breaks: false,
    });
  });

  it('el efecto de una habilidad cuenta sin romper', () => {
    const t = con({
      skillTrees: [
        { id: 'a1', name: 'Arbol', nodes: [{ id: 'n1', name: 'Nodo', effects: { atk: 5 } }] },
      ],
    });
    expect(statReferences(t, 'atk').refs[0]).toMatchObject({ kind: 'skill', where: 'n1' });
  });

  it('un auto-test cuenta por lo que espera y por sus piezas', () => {
    const porEsperado = con({
      selfTests: [
        { name: 'caso', profileId: 'p1', objectiveId: 'dps', items: [], expectStats: { atk: 1 } },
      ],
    });
    expect(kinds(porEsperado, 'atk')).toEqual(['selfTest:caso']);

    const porPieza = con({
      selfTests: [
        {
          name: 'caso',
          profileId: 'p1',
          objectiveId: 'dps',
          items: [pieza({ stats: { atk: 5 } })],
        },
      ],
    });
    expect(kinds(porPieza, 'atk')).toEqual(['selfTest:caso']);
  });
});

describe('statReferences: el inventario', () => {
  it('cuenta las piezas por sus valores y por sus requisitos', () => {
    const items = [
      pieza({ id: 'i1', stats: { atk: 5 } }),
      pieza({ id: 'i2', stats: {}, requires: { atk: 40 } }),
      pieza({ id: 'i3', stats: { atk_pct: 5 } }),
    ];
    expect(kinds(base, 'atk', items)).toEqual(['item:i1', 'item:i2']);
  });

  it('sin inventario no inventa referencias', () => {
    expect(kinds(base, 'atk')).toEqual([]);
  });

  it('una pieza no rompe: el motor ignora lo que no declara', () => {
    const items = [pieza({ stats: { atk: 5 } })];
    expect(statReferences(base, 'atk', items).refs[0].breaks).toBe(false);
  });
});

describe('orden y statInUse', () => {
  it('lo que rompe va primero, que es lo que decide si hay que confirmar', () => {
    const t = con({
      constrainableStats: ['atk'],
      baseProfiles: [{ id: 'p1', name: 'Base', base: { atk: 10 } }],
      budgets: [{ statId: 'atk', max: 100 }],
    });
    const { refs } = statReferences(t, 'atk');
    expect(refs[0].breaks).toBe(true);
    expect(refs.every((ref, i) => i === 0 || !ref.breaks)).toBe(true);
  });

  it('una estadistica que nadie usa se puede borrar sin preguntar', () => {
    expect(statInUse(base, 'atk')).toBe(false);
  });

  it('una formula ilegible cuenta como uso: ante la duda no se afirma', () => {
    const t = con({
      objectives: [{ id: 'dps', name: 'Dano', description: '', kind: 'linear', formula: 'atk +' }],
    });
    expect(statReferences(t, 'atk').refs).toEqual([]);
    expect(statInUse(t, 'atk')).toBe(true);
  });
});
