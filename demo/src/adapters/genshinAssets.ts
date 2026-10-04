/**
 * Iconos oficiales de Genshin (solo Genshin).
 *
 * Junto con goodImport.ts, este es el otro archivo que sabe algo especifico de
 * un juego. El motor y las vistas genericas nunca lo importan directamente:
 * preguntan por un icono y reciben `null` si el juego no tiene assets.
 *
 * Los iconos se sirven desde Project Amber (gi.yatta.moe), un proyecto
 * comunitario. El mapeo clave GOOD -> nombre de icono se genero una sola vez y
 * vive en genshin.assets.json: en tiempo de ejecucion no se llama a ninguna API.
 *
 * NOTA para produccion: servir imagenes del juego desde una CDN de terceros es
 * comodo para una demo pero no es una base sobre la que construir un producto
 * monetizado. Ver la seccion de riesgos del analisis.
 */

import assets from '../games/genshin.assets.json'
import type { Item } from '../core/types'

const BASE = 'https://gi.yatta.moe/assets/UI/'

interface AssetMap {
  chars: Record<string, string>
  weapons: Record<string, string>
  artifacts: Record<string, Record<string, string>>
  rarityChar: Record<string, number>
  rarityWeapon: Record<string, number>
}
const A = assets as AssetMap

export function artifactIcon(gameId: string, setKey: string | null, slot: string): string | null {
  if (gameId !== 'genshin' || !setKey) return null
  const icon = A.artifacts[setKey]?.[slot]
  return icon ? `${BASE}reliquary/${icon}.png` : null
}

export function characterIcon(gameId: string, key: string): string | null {
  if (gameId !== 'genshin') return null
  const icon = A.chars[key]
  return icon ? `${BASE}${icon}.png` : null
}

export function weaponIcon(gameId: string, key: string): string | null {
  if (gameId !== 'genshin') return null
  const icon = A.weapons[key]
  return icon ? `${BASE}${icon}.png` : null
}

export const characterRarity = (key: string): number => A.rarityChar[key] ?? 4
export const weaponRarity = (key: string): number => A.rarityWeapon[key] ?? 3

/** Clave GOOD a partir de un nombre: "Wolf's Gravestone" -> "WolfsGravestone". */
function goodKey(name: string): string {
  return name.replace(/['’]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join('')
}

/**
 * Icono de una pieza cualquiera del inventario.
 *
 * Un artefacto se identifica por conjunto y ranura; un arma, por su nombre. Como
 * el importador guarda el arma como "Wolf's Gravestone · Nv. 90", basta con
 * quedarse con lo anterior al separador. Toda esta suciedad especifica de
 * Genshin vive aqui y no en las vistas.
 */
export function itemIcon(gameId: string, item: Item): string | null {
  if (gameId !== 'genshin') return null
  const porConjunto = artifactIcon(gameId, item.setId, item.slot)
  if (porConjunto) return porConjunto
  const base = item.name.split('·')[0].trim()
  return weaponIcon(gameId, goodKey(base))
}

/** Rareza a partir del nombre, para el marco de color. */
export function itemRarity(item: Item): number {
  if (item.rarity) return item.rarity
  return weaponRarity(goodKey(item.name.split('·')[0].trim()))
}

/** Nombre legible a partir de una clave GOOD: "KamisatoAyaka" -> "Kamisato Ayaka". */
export function humanize(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
}
