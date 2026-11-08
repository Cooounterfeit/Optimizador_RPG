import { describe, expect, it } from 'vitest';

import {
  artifactIconUrl,
  characterIconUrl,
  characterRarity,
  weaponIconUrl,
  weaponRarity,
} from './assets';

describe('iconos', () => {
  it('resuelve el icono de un personaje mapeado', () => {
    expect(characterIconUrl('KamisatoAyaka')).toMatch(/^https:\/\/gi\.yatta\.moe\/assets\/UI\/.+\.png$/);
  });

  it('resuelve el icono de un arma mapeada', () => {
    expect(weaponIconUrl('WolfsGravestone')).toMatch(/reliquary|assets\/UI/);
  });

  it('resuelve el icono de una pieza de conjunto', () => {
    expect(artifactIconUrl('GladiatorsFinale', 'flower')).toMatch(/\/reliquary\/.+\.png$/);
  });

  it('devuelve null cuando el icono no esta mapeado', () => {
    expect(characterIconUrl('Nadie')).toBeNull();
    expect(weaponIconUrl('Nada')).toBeNull();
    expect(artifactIconUrl('Ninguno', 'flower')).toBeNull();
  });

  it('usa rarezas por defecto', () => {
    expect(characterRarity('Nadie')).toBe(4);
    expect(weaponRarity('Nada')).toBe(3);
  });
});
