import { describe, expect, it } from 'vitest';

import { monogram } from './monogram';

describe('monogram', () => {
  it('toma las iniciales de las dos primeras palabras', () => {
    expect(monogram('Neon Drift')).toBe('ND');
    expect(monogram('Hollow: Song')).toBe('HS');
    expect(monogram('Wild Reach')).toBe('WR');
    expect(monogram('Ember Fall')).toBe('EF');
  });

  it('prefiere el numero cuando el nombre lo tiene', () => {
    expect(monogram('Frontier 2')).toBe('F2');
    expect(monogram('Runebound 2')).toBe('R2');
    expect(monogram('Starhold 2')).toBe('S2');
  });

  it('ignora las palabras vacias', () => {
    expect(monogram('The Last of Frontier')).toBe('LF');
  });

  it('con una sola palabra devuelve su inicial', () => {
    expect(monogram('Astral')).toBe('A');
    expect(monogram('Knights (simplified)')).toBe('K');
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
