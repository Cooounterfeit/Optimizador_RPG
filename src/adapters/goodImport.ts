/**
 * Adaptador GOOD -> Zenith
 * ------------------------
 * GOOD (Genshin Open Object Description) es el formato que exportan Genshin
 * Optimizer, Amenoma Kageuchi y otras herramientas de la comunidad.
 *
 * Este archivo es el UNICO lugar del proyecto que sabe algo de Genshin. El
 * motor solo ve `Item[]`, asi que soportar otro juego u otro formato de export
 * es escribir otro adaptador de este tamano, sin tocar nada mas.
 */

import type { Item } from '../core/types'
import giData from '../games/genshin.data.json'

interface GiWeapon {
  name: string; icon: string; rarity: number; type: string | null
  atk: number; maxLevel: number
  sub: { stat: string; value: number } | null
  init: { v: number; c: string } | null
  subInit: { stat: string; v: number; c: string; pct: boolean } | null
  ascAtk: number[]
}
interface GiData {
  characters: Record<string, unknown>
  weapons: Record<string, GiWeapon>
  weaponCurves: Record<string, Record<string, number>>
}
const GI = giData as unknown as GiData

interface GoodSubstat { key: string; value: number }
interface GoodArtifact {
  setKey: string
  rarity: number
  level: number
  slotKey: string
  mainStatKey: string
  substats: GoodSubstat[]
  id?: string
  location?: string
}
interface GoodWeapon {
  key: string
  level?: number
  ascension?: number
  refinement?: number
  location?: string
  id?: string
}
export interface GoodFile { format?: string; artifacts?: GoodArtifact[]; weapons?: GoodWeapon[] }

/**
 * Valor de la estadistica principal segun rareza y nivel.
 * Se interpola linealmente entre nivel 0 y el nivel maximo de la rareza.
 * Es una aproximacion: la tabla real del juego no es perfectamente lineal.
 */
const MAIN_STAT: Record<string, { r5: [number, number]; r4: [number, number] }> = {
  hp:            { r5: [717, 4780], r4: [645, 3571] },
  atk:           { r5: [47, 311],   r4: [42, 232] },
  hp_:           { r5: [7.0, 46.6], r4: [6.3, 34.8] },
  atk_:          { r5: [7.0, 46.6], r4: [6.3, 34.8] },
  def_:          { r5: [8.7, 58.3], r4: [7.9, 43.5] },
  eleMas:        { r5: [28, 187],   r4: [25, 139] },
  enerRech_:     { r5: [7.8, 51.8], r4: [7.0, 38.7] },
  critRate_:     { r5: [4.7, 31.1], r4: [4.2, 23.2] },
  critDMG_:      { r5: [9.3, 62.2], r4: [8.4, 46.4] },
  heal_:         { r5: [5.4, 35.9], r4: [4.8, 26.8] },
  physical_dmg_: { r5: [8.7, 58.3], r4: [7.9, 43.5] },
}
const ELEMENTAL_DMG: [number, number] = [7.0, 46.6]
const ELEMENTS = ['pyro', 'hydro', 'electro', 'cryo', 'anemo', 'geo', 'dendro']

function mainStatValue(key: string, rarity: number, level: number): number {
  const maxLevel = rarity === 5 ? 20 : rarity === 4 ? 16 : 12
  const t = Math.max(0, Math.min(1, level / maxLevel))
  const elemental = ELEMENTS.some((e) => key === `${e}_dmg_`)
  let range: [number, number]
  if (elemental) {
    range = ELEMENTAL_DMG
  } else {
    const entry = MAIN_STAT[key]
    if (!entry) return 0
    range = rarity >= 5 ? entry.r5 : entry.r4
  }
  const [lo, hi] = range
  const scale = rarity >= 5 ? 1 : rarity === 4 ? 1 : 0.75
  return (lo + (hi - lo) * t) * scale
}

const SLOT_NAMES: Record<string, string> = {
  flower: 'Flor', plume: 'Pluma', sands: 'Arena', goblet: 'Caliz', circlet: 'Corona',
}

export interface ImportOptions {
  /** Descarta artefactos por debajo de este nivel. */
  minLevel?: number
  /** Descarta artefactos por debajo de esta rareza. */
  minRarity?: number
  /** Importar tambien las armas como piezas de la ranura "weapon". */
  includeWeapons?: boolean
  /** Id de la ranura de arma en la plantilla destino. */
  weaponSlot?: string
}

export interface ImportResult {
  items: Item[]
  skipped: number
  total: number
  artifacts: number
  weapons: number
}

/**
 * ATQ base y subestadistica de un arma a su nivel y ascension reales.
 *
 * Se calcula con las mismas curvas de crecimiento que usa el juego, en vez de
 * aproximar por rareza: un arma a nivel 1 y la misma a nivel 90 no se parecen en
 * nada, y en una build eso lo cambia todo.
 */
function weaponStats(w: GiWeapon, level: number, ascension: number): Record<string, number> {
  const out: Record<string, number> = {}
  const lvl = Math.max(1, Math.min(level || 1, w.maxLevel))
  const curve = (name: string) => GI.weaponCurves[String(lvl)]?.[name] ?? 1
  if (w.init) {
    const asc = w.ascAtk?.[Math.max(0, Math.min(ascension ?? 0, (w.ascAtk?.length ?? 1) - 1))] ?? 0
    out.weaponAtk = Math.round((w.init.v * curve(w.init.c) + asc) * 10) / 10
  } else if (w.atk) {
    out.weaponAtk = w.atk
  }
  if (w.subInit) {
    const v = w.subInit.v * curve(w.subInit.c) * (w.subInit.pct ? 100 : 1)
    out[w.subInit.stat] = Math.round(v * 10) / 10
  } else if (w.sub) {
    out[w.sub.stat] = w.sub.value
  }
  return out
}

export function importGood(raw: unknown, opts: ImportOptions = {}): ImportResult {
  const file = raw as GoodFile
  const artifacts = Array.isArray(file?.artifacts) ? file.artifacts : []
  const minLevel = opts.minLevel ?? 0
  const minRarity = opts.minRarity ?? 0

  const items: Item[] = []
  let skipped = 0

  artifacts.forEach((a, idx) => {
    if (!a || !a.slotKey || !a.mainStatKey) { skipped++; return }
    if ((a.level ?? 0) < minLevel || (a.rarity ?? 0) < minRarity) { skipped++; return }

    const stats: Record<string, number> = {}
    const mainValue = mainStatValue(a.mainStatKey, a.rarity ?? 5, a.level ?? 0)
    if (mainValue) stats[a.mainStatKey] = (stats[a.mainStatKey] ?? 0) + mainValue

    for (const s of a.substats ?? []) {
      if (!s?.key || !s.value) continue
      stats[s.key] = (stats[s.key] ?? 0) + s.value
    }

    const slotName = SLOT_NAMES[a.slotKey] ?? a.slotKey
    items.push({
      id: a.id ?? `art_${idx}`,
      slot: a.slotKey,
      setId: a.setKey ?? null,
      name: `${slotName} +${a.level ?? 0} · ${a.mainStatKey}`,
      rarity: a.rarity,
      level: a.level,
      stats,
    })
  })

  // ---- Armas ---------------------------------------------------------------
  const weaponSlot = opts.weaponSlot ?? 'weapon'
  const weapons = opts.includeWeapons === false ? [] : (file.weapons ?? [])
  let importedWeapons = 0
  weapons.forEach((w, idx) => {
    const def = GI.weapons[w.key]
    if (!def) { skipped++; return }
    if ((def.rarity ?? 0) < minRarity) { skipped++; return }
    const stats = weaponStats(def, w.level ?? 1, w.ascension ?? 0)
    if (!stats.weaponAtk) { skipped++; return }
    items.push({
      id: w.id ?? `weapon_${idx}`,
      slot: weaponSlot,
      setId: null,
      name: `${def.name} · Nv. ${w.level ?? 1}`,
      rarity: def.rarity,
      level: w.level,
      stats,
      // Un personaje de espada no puede equipar un arco: el perfil declara su
      // tipo de arma y el arma lo exige.
      requires: def.type ? { [`wt_${def.type}`]: 1 } : undefined,
    })
    importedWeapons++
  })

  return {
    items, skipped,
    total: artifacts.length + weapons.length,
    artifacts: items.length - importedWeapons,
    weapons: importedWeapons,
  }
}
