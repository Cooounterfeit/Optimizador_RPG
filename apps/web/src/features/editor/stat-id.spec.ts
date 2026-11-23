import { statIdProblem } from '@zenith/core-engine';
import { describe, expect, it } from 'vitest';

import { suggestStatId } from './stat-id';

describe('suggestStatId', () => {
  it('junta las palabras en camelCase, como las plantillas que ya existen', () => {
    expect(suggestStatId('Ataque fisico', 'flat')).toBe('ataqueFisico');
    expect(suggestStatId('Vida maxima', 'flat')).toBe('vidaMaxima');
    expect(suggestStatId('Fuerza', 'flat')).toBe('fuerza');
  });

  it('nunca produce un guion, que es lo que lo romperia todo', () => {
    // Con `slugify` esto daria "ataque-critico", que en una formula es una resta.
    const id = suggestStatId('Ataque critico', 'flat');
    expect(id).not.toContain('-');
    expect(statIdProblem(id)).toBeUndefined();
  });

  it('quita los acentos en vez de comerse la letra', () => {
    expect(suggestStatId('Daño mágico', 'flat')).toBe('danoMagico');
  });

  it('respeta la convencion del guion bajo final para las porcentuales', () => {
    expect(suggestStatId('Ataque', 'percent')).toBe('ataque_');
    expect(suggestStatId('Prob critico', 'percent')).toBe('probCritico_');
  });

  it('no deja un id que empiece por numero', () => {
    const id = suggestStatId('2 manos', 'flat');
    expect(statIdProblem(id)).toBeUndefined();
    expect(id).toBe('_2Manos');
  });

  it('numera la raiz, para que el guion bajo final no se desplace', () => {
    expect(suggestStatId('Ataque', 'percent', ['ataque_'])).toBe('ataque2_');
    expect(suggestStatId('Ataque', 'flat', ['ataque'])).toBe('ataque2');
    expect(suggestStatId('Ataque', 'flat', ['ataque', 'ataque2'])).toBe(
      'ataque3',
    );
  });

  it('esquiva los nombres de funcion del lenguaje de formulas', () => {
    // "Max" daria "max", que es una funcion, asi que numera.
    expect(suggestStatId('Max', 'flat')).toBe('max2');
    expect(suggestStatId('Clamp', 'flat')).toBe('clamp2');
    // "Base atk" da "baseAtk", que NO empieza por el prefijo reservado
    // "base_", asi que no hay nada que esquivar.
    expect(suggestStatId('Base atk', 'flat')).toBe('baseAtk');
  });

  it('cae en un nombre por defecto cuando no queda nada utilizable', () => {
    expect(suggestStatId('', 'flat')).toBe('stat');
    expect(suggestStatId('%%%', 'flat')).toBe('stat');
    expect(suggestStatId('%%%', 'percent')).toBe('stat_');
  });

  it('todo lo que produce pasa el guardian del motor', () => {
    const nombres = [
      'Ataque critico',
      'Daño mágico',
      '2 manos',
      'Max',
      '',
      'Vida máxima %',
    ];
    for (const unit of ['flat', 'percent'] as const) {
      for (const nombre of nombres) {
        const id = suggestStatId(nombre, unit);
        expect(
          statIdProblem(id),
          `${nombre} (${unit}) -> ${id}`,
        ).toBeUndefined();
      }
    }
  });
});
