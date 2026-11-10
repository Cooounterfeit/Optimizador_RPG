import { goodKey } from '@zenith/inventory';
import type { BaseProfile, GameAssets, Item, SkillNode } from '@zenith/shared-types';

/**
 * Unico punto de resolucion de iconos. Ningun componente arma URLs por su
 * cuenta: las fuentes y las rutas viven en la plantilla del juego.
 */
const trimEnd = (value: string): string => value.replace(/\/+$/, '');
const trimStart = (value: string): string => value.replace(/^\/+/, '');

/** Combina cada fuente con la ruta relativa, en orden de intento. */
export function assetUrls(assets: GameAssets | undefined, path: string | null | undefined): string[] {
  if (!path) return [];
  return (assets?.sources ?? []).map((source) => `${trimEnd(source)}/${trimStart(path)}`);
}

export function entryIconUrls(assets: GameAssets | undefined, nameOrKey: string): string[] {
  const base = nameOrKey.split('·')[0].trim();
  const path = assets?.weapons?.[goodKey(base)] ?? assets?.weapons?.[base];
  return assetUrls(assets, path);
}

export function characterIconUrls(assets: GameAssets | undefined, profile: BaseProfile): string[] {
  const key = profile.assetKey ?? profile.id;
  return assetUrls(assets, assets?.characters?.[key]);
}

export function setIconUrls(
  assets: GameAssets | undefined,
  setId: string,
  slot: string | undefined,
): string[] {
  if (!slot) return [];
  return assetUrls(assets, assets?.artifacts?.[setId]?.[slot]);
}

/** Icono de una pieza: primero por conjunto y ranura; si no, por nombre de arma. */
export function itemIconUrls(assets: GameAssets | undefined, item: Item): string[] {
  if (item.setId) {
    const artifact = setIconUrls(assets, item.setId, item.slot);
    if (artifact.length > 0) return artifact;
  }
  return entryIconUrls(assets, item.name);
}

export function skillIconUrls(assets: GameAssets | undefined, node: SkillNode): string[] {
  return assetUrls(assets, assets?.skills?.[node.assetKey ?? node.id]);
}

export function characterRarityOf(
  assets: GameAssets | undefined,
  profile: BaseProfile,
): number | undefined {
  return assets?.rarity?.characters?.[profile.assetKey ?? profile.id];
}

export function entryRarityOf(assets: GameAssets | undefined, key: string): number | undefined {
  return assets?.rarity?.weapons?.[key];
}
