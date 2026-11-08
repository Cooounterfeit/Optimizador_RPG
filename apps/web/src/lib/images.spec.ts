import type { GameAssets, Item } from '@zenith/shared-types';
import { describe, expect, it } from 'vitest';

import {
  assetUrls,
  characterIconUrls,
  characterRarityOf,
  itemIconUrls,
  setIconUrls,
  weaponIconUrls,
} from './images';

const assets: GameAssets = {
  sources: ['https://storage.test/icons/', 'https://cdn.test/ui'],
  characters: { nova: 'characters/nova.png' },
  weapons: { StarlightBlade: 'weapons/blade.png' },
  artifacts: { 'astral-core': { flower: 'reliquary/flower.png' } },
  rarity: { characters: { nova: 5 }, weapons: { StarlightBlade: 4 } },
};

describe('assetUrls', () => {
  it('combina todas las fuentes en orden y normaliza las barras', () => {
    expect(assetUrls(assets, '/characters/nova.png')).toEqual([
      'https://storage.test/icons/characters/nova.png',
      'https://cdn.test/ui/characters/nova.png',
    ]);
  });

  it('devuelve vacio sin ruta o sin fuentes', () => {
    expect(assetUrls(assets, null)).toEqual([]);
    expect(assetUrls({}, 'x.png')).toEqual([]);
  });
});

describe('iconos', () => {
  it('busca el arma por clave GOOD', () => {
    expect(weaponIconUrls(assets, 'Starlight Blade')[0]).toBe(
      'https://storage.test/icons/weapons/blade.png',
    );
  });

  it('resuelve personaje por assetKey o id', () => {
    expect(characterIconUrls(assets, { id: 'nova', name: 'Nova', base: {} })[0]).toBe(
      'https://storage.test/icons/characters/nova.png',
    );
  });

  it('resuelve conjunto y ranura', () => {
    expect(setIconUrls(assets, 'astral-core', 'flower')[0]).toBe(
      'https://storage.test/icons/reliquary/flower.png',
    );
  });

  it('prefiere el conjunto y cae al nombre del arma', () => {
    const artifact: Item = {
      id: 'a',
      slot: 'flower',
      setId: 'astral-core',
      name: 'Flower',
      stats: {},
    };
    const weapon: Item = {
      id: 'w',
      slot: 'weapon',
      setId: null,
      name: 'Starlight Blade',
      stats: {},
    };

    expect(itemIconUrls(assets, artifact)[0]).toContain('reliquary/flower.png');
    expect(itemIconUrls(assets, weapon)[0]).toContain('weapons/blade.png');
  });
});

describe('rarezas', () => {
  it('usa el mapa y cae en el valor por defecto', () => {
    expect(characterRarityOf(assets, { id: 'nova', name: 'Nova', base: {} })).toBe(5);
    expect(characterRarityOf(assets, { id: 'otro', name: 'Otro', base: {} })).toBe(4);
    expect(characterRarityOf(undefined, { id: 'nova', name: 'Nova', base: {} })).toBe(4);
  });
});
