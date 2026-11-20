import { GameTemplateSchema } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import { buildSkeleton, slugify, uniqueGameId } from './skeleton';

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
