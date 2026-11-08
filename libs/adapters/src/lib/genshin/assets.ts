import assets from './genshin.assets.json';

const BASE = 'https://gi.yatta.moe/assets/UI/';

interface AssetMap {
  chars: Record<string, string>;
  weapons: Record<string, string>;
  artifacts: Record<string, Record<string, string>>;
  rarityChar: Record<string, number>;
  rarityWeapon: Record<string, number>;
}

const ASSETS = assets as unknown as AssetMap;

/** URL del icono de un personaje; `null` si no esta mapeado. */
export function characterIconUrl(key: string): string | null {
  const icon = ASSETS.chars[key];
  return icon ? `${BASE}${icon}.png` : null;
}

/** URL del icono de un arma por su clave GOOD; `null` si no esta mapeada. */
export function weaponIconUrl(key: string): string | null {
  const icon = ASSETS.weapons[key];
  return icon ? `${BASE}${icon}.png` : null;
}

/** URL del icono de una pieza de conjunto; `null` si no esta mapeada. */
export function artifactIconUrl(setId: string, slot: string): string | null {
  const icon = ASSETS.artifacts[setId]?.[slot];
  return icon ? `${BASE}reliquary/${icon}.png` : null;
}

export function characterRarity(key: string): number {
  return ASSETS.rarityChar[key] ?? 4;
}

export function weaponRarity(key: string): number {
  return ASSETS.rarityWeapon[key] ?? 3;
}
