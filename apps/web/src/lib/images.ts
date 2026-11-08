import {
  artifactIconUrl,
  characterIconUrl as assetCharacterIcon,
  characterRarity,
  goodKey,
  weaponIconUrl as assetWeaponIcon,
} from '@zenith/adapters';
import type { BaseProfile, Item } from '@zenith/shared-types';

/**
 * Unico punto de resolucion de iconos. Ningun componente arma URLs por su
 * cuenta: si el CDN cambia (F11.1, jsDelivr), se toca solo este archivo.
 */
export function weaponIconUrl(nameOrKey: string): string | null {
  const base = nameOrKey.split('·')[0].trim();
  return assetWeaponIcon(goodKey(base)) ?? assetWeaponIcon(base);
}

export function characterIconUrl(profile: BaseProfile): string | null {
  return assetCharacterIcon(profile.assetKey ?? profile.id);
}

export function setIconUrl(setId: string, slot = 'flower'): string | null {
  return artifactIconUrl(setId, slot);
}

/** Icono de una pieza: primero por conjunto y ranura; si no, por nombre de arma. */
export function itemIconUrl(item: Item): string | null {
  if (item.setId) {
    const artifact = artifactIconUrl(item.setId, item.slot);
    if (artifact) return artifact;
  }
  return weaponIconUrl(item.name);
}

export function characterRarityOf(profile: BaseProfile): number {
  return characterRarity(profile.assetKey ?? profile.id);
}
