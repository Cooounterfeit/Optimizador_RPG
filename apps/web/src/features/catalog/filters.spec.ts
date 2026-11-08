import { describe, expect, it } from 'vitest';

import {
  categoryFacets,
  filterOptimizers,
  initialFilterState,
  topRanks,
  UNCATEGORIZED,
  type CatalogFilterState,
} from './filters';
import type { CatalogOptimizer } from './types';

const make = (overrides: Partial<CatalogOptimizer>): CatalogOptimizer => ({
  id: 'id',
  name: 'Optimizer',
  gameName: 'Game',
  description: '',
  author: { id: 'author', displayName: 'author' },
  score: 0,
  votesCount: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  published: true,
  ...overrides,
});

const list: CatalogOptimizer[] = [
  make({
    id: 'a',
    name: 'Zeta solver',
    gameName: 'Neon Drift',
    category: 'Action RPG',
    author: { id: 'kalibr', displayName: 'kalibr' },
    score: 300,
    createdAt: '2026-10-20T00:00:00.000Z',
  }),
  make({
    id: 'b',
    name: 'Alpha solver',
    gameName: 'Emberfall',
    category: 'ARPG',
    author: { id: 'brutus', displayName: 'brutus' },
    score: 120,
    createdAt: '2026-10-25T00:00:00.000Z',
  }),
  make({
    id: 'c',
    name: 'Mid solver',
    gameName: 'Emberfall',
    author: { id: 'tacet', displayName: 'tacet' },
    score: 40,
    createdAt: '2026-10-10T00:00:00.000Z',
  }),
];

const state = (overrides: Partial<CatalogFilterState> = {}): CatalogFilterState => ({
  ...initialFilterState,
  ...overrides,
});

describe('filterOptimizers', () => {
  it('filtra por genero', () => {
    expect(filterOptimizers(list, state({ category: 'ARPG' })).map((o) => o.id)).toEqual(['b']);
  });

  it('agrupa lo que no tiene genero', () => {
    expect(filterOptimizers(list, state({ category: UNCATEGORIZED })).map((o) => o.id)).toEqual([
      'c',
    ]);
  });

  it('busca por titulo, juego o autor', () => {
    expect(filterOptimizers(list, state({ query: 'brutus' })).map((o) => o.id)).toEqual(['b']);
    expect(filterOptimizers(list, state({ query: 'ember' })).map((o) => o.id)).toEqual(['b', 'c']);
  });

  it('ordena por puntaje, por fecha y alfabeticamente', () => {
    expect(filterOptimizers(list, state({ sort: 'top' })).map((o) => o.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(filterOptimizers(list, state({ sort: 'new' })).map((o) => o.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(filterOptimizers(list, state({ sort: 'az' })).map((o) => o.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('deja solo los mejor valorados', () => {
    expect(filterOptimizers(list, state({ topOnly: true })).map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('devuelve vacio cuando nada coincide', () => {
    expect(filterOptimizers(list, state({ query: 'nada' }))).toEqual([]);
  });

  it('no muta la lista original', () => {
    const before = list.map((o) => o.id);
    filterOptimizers(list, state({ sort: 'az' }));
    expect(list.map((o) => o.id)).toEqual(before);
  });
});

describe('categoryFacets', () => {
  it('cuenta por genero y ordena de mayor a menor', () => {
    expect(categoryFacets(list)).toEqual([
      { name: 'Action RPG', count: 1 },
      { name: 'ARPG', count: 1 },
      { name: UNCATEGORIZED, count: 1 },
    ]);
  });
});

describe('topRanks', () => {
  it('marca los tres primeros por puntaje', () => {
    const ranks = topRanks(list);
    expect(ranks.get('a')).toBe(1);
    expect(ranks.get('b')).toBe(2);
    expect(ranks.get('c')).toBe(3);
  });
});
