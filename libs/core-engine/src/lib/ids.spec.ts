import { describe, expect, it } from 'vitest';

import { statIdProblem } from './ids.js';
import { validateTemplate } from './validate.js';

describe('statIdProblem', () => {
  it('acepta lo que las plantillas de verdad usan', () => {
    // Tomados de los ejemplos: cortos, camelCase, y el guion bajo final que
    // marca la version porcentual.
    for (const id of ['hp', 'atk', 'str', 'atkPhys', 'maxLife', 'hp_', 'critRate_', '_x']) {
      expect(statIdProblem(id), id).toBeUndefined();
    }
  });

  it('exige un id', () => {
    expect(statIdProblem('')).toBe('empty');
    expect(statIdProblem('   ')).toBe('empty');
  });

  it('rechaza lo que el tokenizador no leeria como una sola variable', () => {
    // El guion es el caso peligroso: "ataque-critico" se lee como una resta.
    expect(statIdProblem('ataque-critico')).toBe('shape');
    expect(statIdProblem('ataque critico')).toBe('shape');
    expect(statIdProblem('2atk')).toBe('shape');
    expect(statIdProblem('atk.pct')).toBe('shape');
    expect(statIdProblem('critico')).toBeUndefined();
  });

  it('no deja llamarla como una funcion del lenguaje', () => {
    for (const id of ['min', 'max', 'clamp', 'if', 'sqrt', 'pow']) {
      expect(statIdProblem(id), id).toBe('reserved');
    }
  });

  it('protege los prefijos que el motor usa para sus propias variables', () => {
    expect(statIdProblem('base_atk')).toBe('prefix');
    expect(statIdProblem('skill_furia')).toBe('prefix');
    // Pero la palabra suelta no tiene nada de malo.
    expect(statIdProblem('base')).toBeUndefined();
    expect(statIdProblem('baseAtk')).toBeUndefined();
  });

  it('delata el id ya usado cuando se le pasa la lista', () => {
    expect(statIdProblem('atk', ['hp', 'atk'])).toBe('taken');
    expect(statIdProblem('atk', ['hp'])).toBeUndefined();
  });
});

describe('validateTemplate aplica la regla', () => {
  const base = {
    schemaVersion: '0.1',
    gameId: 'x',
    name: 'x',
    description: '',
    slots: [{ id: 'arma', name: 'Arma' }],
    sets: [],
    derived: [],
    objectives: [
      { id: 'dps', name: 'd', description: '', kind: 'linear', formula: 'atk' },
    ],
    baseProfiles: [{ id: 'p', name: 'P', base: { atk: 1 } }],
    constrainableStats: [],
  };

  const codes = (stats: unknown[], derived: unknown[] = []) =>
    validateTemplate({ ...base, stats, derived }).issues.map((issue) => issue.code);

  it('delata el id con guion, que antes pasaba sin una queja', () => {
    expect(codes([{ id: 'ataque-critico', name: 'Ataque critico', unit: 'flat' }])).toContain(
      'E_ID_FORMA',
    );
  });

  it('delata el nombre de funcion y el prefijo reservado', () => {
    expect(codes([{ id: 'max', name: 'Maximo', unit: 'flat' }])).toContain('E_ID_RESERVADO');
    expect(codes([{ id: 'base_atk', name: 'Base', unit: 'flat' }])).toContain('E_ID_RESERVADO');
  });

  it('tambien mira los valores derivados, que tambien son variables', () => {
    expect(
      codes([{ id: 'atk', name: 'Atk', unit: 'flat' }], [{ id: 'dano-total', name: 'D', formula: 'atk' }]),
    ).toContain('E_ID_FORMA');
  });

  it('no se queja de una plantilla con ids correctos', () => {
    const emitidos = codes([{ id: 'atk', name: 'Atk', unit: 'flat' }]);
    expect(emitidos).not.toContain('E_ID_FORMA');
    expect(emitidos).not.toContain('E_ID_RESERVADO');
  });
});
