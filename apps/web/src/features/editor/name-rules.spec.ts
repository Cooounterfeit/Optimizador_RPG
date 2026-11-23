import { describe, expect, it } from 'vitest';

import { nameProblem } from './name-rules';

/**
 * Las reglas se prueban con la lista blanca puesta, que es el caso de CFG-05 y
 * el unico que la usa. Las tres reglas restantes valen para cualquier nombre.
 */
const OPCIONES = { restrictChars: true } as const;

describe('nameProblem', () => {
  it('acepta un nombre corriente', () => {
    expect(nameProblem('Hollow Knight', OPCIONES)).toBeUndefined();
  });

  it('exige un nombre, y un campo con solo espacios no cuenta', () => {
    expect(nameProblem('', OPCIONES)).toBe('required');
    expect(nameProblem('   ', OPCIONES)).toBe('required');
  });

  it('corta a los 100 caracteres, no antes', () => {
    expect(nameProblem('a'.repeat(100))).toBeUndefined();
    expect(nameProblem('a'.repeat(101))).toBe('tooLong');
  });

  it('rechaza los caracteres que el criterio no permite', () => {
    for (const malo of [
      'Juego@',
      'Juego#1',
      'Juego!',
      'Juego$',
      'Juego-2',
      'Juego.1',
    ]) {
      expect(nameProblem(malo, OPCIONES)).toBe('badChars');
    }
  });

  it('admite guion bajo, numeros y espacios, que si estan permitidos', () => {
    expect(nameProblem('Final Fantasy 7_remake', OPCIONES)).toBeUndefined();
  });

  it('no trata un nombre acentuado o no latino como invalido', () => {
    expect(nameProblem('Dragón Quest', OPCIONES)).toBeUndefined();
    expect(nameProblem('Pokémon', OPCIONES)).toBeUndefined();
    expect(nameProblem('ドラゴンクエスト', OPCIONES)).toBeUndefined();
  });

  it('delata el nombre repetido sin mirar mayusculas ni espacios al borde', () => {
    expect(
      nameProblem('Elden Ring', { ...OPCIONES, taken: ['Elden Ring'] }),
    ).toBe('taken');
    expect(
      nameProblem('elden ring', { ...OPCIONES, taken: ['Elden Ring'] }),
    ).toBe('taken');
    expect(
      nameProblem('  Elden Ring  ', { ...OPCIONES, taken: ['Elden Ring'] }),
    ).toBe('taken');
  });

  it('deja pasar un nombre que solo se parece a otro', () => {
    expect(
      nameProblem('Elden Ring 2', { ...OPCIONES, taken: ['Elden Ring'] }),
    ).toBeUndefined();
  });

  it('informa del primer problema y no de todos, para no apilar errores', () => {
    // Largo y con caracter invalido a la vez: manda el largo.
    expect(nameProblem(`${'a'.repeat(101)}@`, OPCIONES)).toBe('tooLong');
  });
});

describe('sin lista blanca', () => {
  it('deja pasar los caracteres que un nombre de juego no admitiria', () => {
    // Es el caso de un atributo: la historia no le restringe caracteres.
    expect(nameProblem('Ataque @ distancia')).toBeUndefined();
    expect(nameProblem('Crit %')).toBeUndefined();
  });

  it('pero las otras tres reglas siguen valiendo', () => {
    expect(nameProblem('  ')).toBe('required');
    expect(nameProblem('a'.repeat(101))).toBe('tooLong');
    expect(nameProblem('Fuerza', { taken: ['fuerza'] })).toBe('taken');
  });
});
