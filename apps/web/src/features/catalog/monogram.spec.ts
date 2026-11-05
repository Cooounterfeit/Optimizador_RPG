import { describe, expect, it } from 'vitest';

import { monogram } from './monogram';

describe('monogram', () => {
  it('toma las iniciales de las dos primeras palabras', () => {
    expect(monogram('Zenless Zone Zero')).toBe('ZZ');
    expect(monogram('Honkai: Star Rail')).toBe('HS');
    expect(monogram('Monster Hunter Wilds')).toBe('MH');
    expect(monogram('Wuthering Waves')).toBe('WW');
  });

  it('prefiere el numero cuando el nombre lo tiene', () => {
    expect(monogram('Age of Empires 2')).toBe('A2');
    expect(monogram('Path of Exile 2')).toBe('P2');
    expect(monogram('Destiny 2')).toBe('D2');
  });

  it('ignora las palabras vacias', () => {
    expect(monogram('The Last of Us')).toBe('LU');
  });

  it('con una sola palabra devuelve su inicial', () => {
    expect(monogram('Genshin')).toBe('G');
    expect(monogram('Souls (simplificado)')).toBe('S');
  });

  it('quita acentos', () => {
    expect(monogram('Épica Guerra')).toBe('EG');
  });

  it('cae en un valor seguro cuando no hay nada util', () => {
    expect(monogram('')).toBe('?');
    expect(monogram('---')).toBe('?');
    expect(monogram('2048')).toBe('2');
  });
});
