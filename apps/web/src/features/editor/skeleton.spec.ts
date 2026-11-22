import { GameTemplateSchema } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import { buildSkeleton, nameProblem, slugify, uniqueGameId } from './skeleton';

describe('slugify', () => {
  it('quita acentos en vez de comerse la letra', () => {
    expect(slugify('Dragón Oscuro')).toBe('dragon-oscuro');
  });

  it('colapsa separadores y recorta los extremos', () => {
    expect(slugify('  Hollow   Knight!! ')).toBe('hollow-knight');
  });

  it('acota la longitud para que el id quepa en una URL', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(48);
  });

  it('devuelve vacio cuando no queda nada utilizable', () => {
    expect(slugify('???')).toBe('');
  });
});

describe('uniqueGameId', () => {
  it('usa el id tal cual si esta libre', () => {
    expect(uniqueGameId('elden', ['otro'])).toBe('elden');
  });

  it('numera cuando ya existe, sin tocar el nombre visible', () => {
    expect(uniqueGameId('elden', ['elden'])).toBe('elden-2');
    expect(uniqueGameId('elden', ['elden', 'elden-2'])).toBe('elden-3');
  });

  it('cae en un nombre por defecto si el slug quedo vacio', () => {
    expect(uniqueGameId('', [])).toBe('juego');
  });
});

describe('buildSkeleton', () => {
  const minimo = { name: 'Mi juego' };

  it('produce una plantilla que el esquema acepta', () => {
    const template = buildSkeleton(minimo, 'mi-juego');
    expect(GameTemplateSchema.safeParse(template).success).toBe(true);
  });

  it('arranca vacio: valida pero todavia no sirve para optimizar', () => {
    const template = buildSkeleton(minimo, 'mi-juego');

    expect(template.stats).toEqual([]);
    expect(template.slots).toEqual([]);
    expect(template.objectives).toEqual([]);
    expect(template.baseProfiles).toEqual([]);
  });

  it('el id de la plantilla es el que se le pasa, no el derivado del nombre', () => {
    const template = buildSkeleton(minimo, 'mi-juego-2');
    expect(template.gameId).toBe('mi-juego-2');
  });

  it('limpia los espacios del nombre y la descripcion', () => {
    const template = buildSkeleton({ name: '  Mi juego  ', description: '  algo  ' }, 'x');
    expect(template.name).toBe('Mi juego');
    expect(template.description).toBe('algo');
  });

  it('omite la categoria cuando viene vacia en vez de guardar una cadena sola', () => {
    expect(buildSkeleton({ name: 'x', category: '   ' }, 'x').category).toBeUndefined();
    expect(buildSkeleton({ name: 'x', category: 'Souls' }, 'x').category).toBe('Souls');
  });
});

describe('nameProblem', () => {
  it('acepta un nombre corriente', () => {
    expect(nameProblem('Hollow Knight')).toBeUndefined();
  });

  it('exige un nombre, y un campo con solo espacios no cuenta', () => {
    expect(nameProblem('')).toBe('required');
    expect(nameProblem('   ')).toBe('required');
  });

  it('corta a los 100 caracteres, no antes', () => {
    expect(nameProblem('a'.repeat(100))).toBeUndefined();
    expect(nameProblem('a'.repeat(101))).toBe('tooLong');
  });

  it('rechaza los caracteres que el criterio no permite', () => {
    for (const malo of ['Juego@', 'Juego#1', 'Juego!', 'Juego$', 'Juego-2', 'Juego.1']) {
      expect(nameProblem(malo)).toBe('badChars');
    }
  });

  it('admite guion bajo, numeros y espacios, que si estan permitidos', () => {
    expect(nameProblem('Final Fantasy 7_remake')).toBeUndefined();
  });

  it('no trata un nombre acentuado o no latino como invalido', () => {
    expect(nameProblem('Dragón Quest')).toBeUndefined();
    expect(nameProblem('Pokémon')).toBeUndefined();
    expect(nameProblem('ドラゴンクエスト')).toBeUndefined();
  });

  it('delata el nombre repetido sin mirar mayusculas ni espacios al borde', () => {
    expect(nameProblem('Elden Ring', ['Elden Ring'])).toBe('taken');
    expect(nameProblem('elden ring', ['Elden Ring'])).toBe('taken');
    expect(nameProblem('  Elden Ring  ', ['Elden Ring'])).toBe('taken');
  });

  it('deja pasar un nombre que solo se parece a otro', () => {
    expect(nameProblem('Elden Ring 2', ['Elden Ring'])).toBeUndefined();
  });

  it('informa del primer problema y no de todos, para no apilar errores', () => {
    // Largo y con caracter invalido a la vez: manda el largo.
    expect(nameProblem(`${'a'.repeat(101)}@`)).toBe('tooLong');
  });
});
